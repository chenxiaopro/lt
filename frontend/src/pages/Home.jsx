import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context.jsx";
import PostCard, { MomentCard, PinRow, TitleBadges, TitleText } from "../components/PostCard.jsx";
import Side from "./Side.jsx";
import { FeedSkeleton } from "../components/Skeleton.jsx";

let homeCache = null;
const feedCache = new Map();

function BannerSlideshow({ banners }) {
  const [i, setI] = useState(0);
  const startX = useRef(0);
  useEffect(() => {
    if (!banners || banners.length < 2) return undefined;
    const t = setInterval(() => setI((n) => (n + 1) % banners.length), 4200);
    return () => clearInterval(t);
  }, [banners]);
  if (!banners || !banners.length) return null;
  const p = banners[Math.min(i, banners.length - 1)];
  function onTouchStart(e) {
    startX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e) {
    if (!banners || banners.length < 2) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    if (dx > 40) setI((n) => (n - 1 + banners.length) % banners.length);
    else if (dx < -40) setI((n) => (n + 1) % banners.length);
  }
  return (
    <div className="banner-slideshow" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <Link className="banner-slide full" to={`/post/${p.id}`}>
        <img src={(p.images || [])[0] || p.author?.avatar} alt="" decoding="async" />
        <div className="cap">
          <h3 className="post-title">
            <TitleBadges post={p} />
            <TitleText post={p} />
          </h3>
          <p>{p.board?.name}</p>
        </div>
      </Link>
      {banners.length > 1 ? (
        <div className="banner-dots">
          {banners.map((_, j) => (
            <button key={j} type="button" className={j === i ? "on" : ""} onClick={() => setI(j)} aria-label={`第${j + 1}张`} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function Home() {
  const { user, toast } = useAuth();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const [tab, setTab] = useState(sp.get("tab") || "recommend");
  const isMoment = sp.get("view") === "moment";
  const feedBase = isMoment ? "latest" : (sp.get("tab") || "recommend");
  const firstKey = `${user?.id || 0}:${feedBase}`;
  const [posts, setPosts] = useState(() => (feedCache.get(firstKey) || {}).posts || []);
  const [home, setHome] = useState(homeCache || { banners: [], hotBoards: [], hots: [] });
  const [loading, setLoading] = useState(() => !feedCache.has(firstKey));
  const [hasMore, setHasMore] = useState(() => !!(feedCache.get(firstKey) || {}).hasMore);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (homeCache) return;
    api("/api/home").then((d) => {
      homeCache = d;
      setHome(d);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const t = sp.get("tab");
    if (t) setTab(t);
    else setTab("recommend");
  }, [sp]);

  useEffect(() => {
    const key = `${user?.id || 0}:${isMoment ? "latest" : tab}`;
    const feedTab = isMoment ? "latest" : tab;
    const cached = feedCache.get(key);
    if (cached) {
      setPosts(cached.posts);
      setHasMore(!!cached.hasMore);
      setLoading(false);
    } else {
      setLoading(true);
    }
    const ctrl = new AbortController();
    api(`/api/posts?tab=${feedTab}&limit=30&offset=0`, { signal: ctrl.signal })
      .then((d) => {
        const next = d.posts || [];
        setPosts(next);
        setHasMore(!!d.hasMore);
        feedCache.set(key, { posts: next, hasMore: !!d.hasMore });
      })
      .catch((err) => {
        if (!ctrl.signal.aborted) setPosts([]);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [tab, user, isMoment]);

  const banners = (home.banners || []).slice(0, 4);
  const pins = !isMoment && tab === "recommend" ? posts.filter((p) => p.official) : [];
  const feed = pins.length ? posts.filter((p) => !p.official) : posts;

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    const key = `${user?.id || 0}:${isMoment ? "latest" : tab}`;
    const feedTab = isMoment ? "latest" : tab;
    setLoadingMore(true);
    try {
      const d = await api(`/api/posts?tab=${feedTab}&limit=30&offset=${posts.length}`);
      const list = d.posts || [];
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const next = prev.concat(list.filter((p) => !seen.has(p.id)));
        feedCache.set(key, { posts: next, hasMore: !!d.hasMore });
        return next;
      });
      setHasMore(!!d.hasMore);
    } catch {
      toast("加载失败");
    } finally {
      setLoadingMore(false);
    }
  }

  async function likeMoment(post) {
    if (!user) return nav("/login");
    try {
      const d = await api(`/api/posts/${post.id}/like`, { method: "POST" });
      setPosts((list) => {
        const next = list.map((p) => (p.id === post.id ? { ...p, liked: d.liked, likeCount: d.likeCount } : p));
        const key = `${user?.id || 0}:${isMoment ? "latest" : tab}`;
        const cached = feedCache.get(key);
        if (cached) feedCache.set(key, { ...cached, posts: next });
        return next;
      });
    } catch {
      toast("点赞失败");
    }
  }

  return (
    <div className={`layout ${isMoment ? "single" : ""}`}>
      <div className={`feed ${isMoment ? "moment-feed" : "lucky-home"}`}>
        {isMoment ? null : <BannerSlideshow banners={banners} />}
        {isMoment ? null : (
          <div className="chips">
            {[
              ["recommend", "推荐"],
              ["follow", "关注"],
              ["hot", "热门"],
              ["essence", "精华"]
            ].map(([k, label]) => (
              <button key={k} type="button" className={`chip ${tab === k ? "on" : ""}`} onClick={() => { setTab(k); nav(k === "recommend" ? "/" : `/?tab=${k}`); }}>
                {label}
              </button>
            ))}
          </div>
        )}
        {tab === "follow" && !user && !isMoment ? (
          <div className="empty soft">登录后看关注的人和版块</div>
        ) : loading ? (
          <FeedSkeleton />
        ) : posts.length ? (
          isMoment ? (
            <>
              {user ? (
                <Link className="moment-composer" to="/publish?type=moment">
                  <img className="avatar" src={user.avatar} alt="" />
                  <span>这一刻想说...</span>
                </Link>
              ) : null}
              {posts.map((p) => <MomentCard key={p.id} post={p} onLike={likeMoment} />)}
            </>
          ) : (
            <>
              {pins.map((p) => <PinRow key={`pin-${p.id}`} post={p} showBoardPin={false} />)}
              {feed.map((p) => <PostCard key={p.id} post={p} />)}
            </>
          )
        ) : (
          <div className="empty soft">{tab === "follow" ? "还没有关注内容，去圈子加点版块" : "这层楼还安静"}</div>
        )}
        {!loading && posts.length && hasMore ? (
          <button type="button" className="btn btn-line touch-act" onClick={loadMore}>{loadingMore ? "加载中" : "加载更多"}</button>
        ) : null}
      </div>
      {isMoment ? null : <Side home={home} />}
    </div>
  );
}
