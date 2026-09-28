import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context.jsx";
import PostCard, { MomentCard } from "../components/PostCard.jsx";
import Side from "./Side.jsx";

export default function Home() {
  const { user } = useAuth();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const [tab, setTab] = useState(sp.get("tab") || "recommend");
  const [posts, setPosts] = useState([]);
  const [home, setHome] = useState({ banners: [], hotBoards: [], hots: [] });
  const isMoment = sp.get("view") === "moment";

  useEffect(() => {
    api("/api/home").then(setHome).catch(() => {});
  }, []);

  useEffect(() => {
    const t = sp.get("tab");
    if (t) setTab(t);
    else setTab("recommend");
  }, [sp]);

  useEffect(() => {
    const key = isMoment ? "latest" : tab;
    api(`/api/posts?tab=${key}`).then((d) => setPosts(d.posts || [])).catch(() => {});
  }, [tab, user, isMoment]);

  const banners = (home.banners || []).slice(0, 4);

  async function likeMoment(post) {
    if (!user) return nav("/login");
    try {
      const d = await api(`/api/posts/${post.id}/like`, { method: "POST" });
      setPosts((list) => list.map((p) => (p.id === post.id ? { ...p, liked: d.liked, likeCount: d.likeCount } : p)));
    } catch {
      /* keep current like state */
    }
  }

  return (
    <div className={`layout ${isMoment ? "single" : ""}`}>
      <div className={`feed ${isMoment ? "moment-feed" : "lucky-home"}`}>
        {isMoment ? null : banners.length ? (
          <div className="banner-swipe">
            {banners.map((p) => (
              <Link className="banner-slide" key={p.id} to={`/post/${p.id}`}>
                <img src={(p.images || [])[0] || p.author.avatar} alt="" />
                <div className="cap">
                  <h3>{p.title}</h3>
                  <p>{p.board?.name}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : null}
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
            posts.map((p) => <PostCard key={p.id} post={p} />)
          )
        ) : (
          <div className="empty soft">{tab === "follow" ? "还没有关注内容，去圈子加点版块" : "这层楼还安静"}</div>
        )}
      </div>
      {isMoment ? null : <Side home={home} />}
    </div>
  );
}
