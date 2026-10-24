import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, formatHeat } from "../api.js";
import { useAuth } from "../context.jsx";
import { PostRow } from "../components/PostCard.jsx";
import { BackTop } from "../components/ListScroll.jsx";
import { BackIco } from "../icons.jsx";
import { HonorChips, LevelMark, MedalRow, MedalWall, UserAvatar, UserName, cardVars } from "../components/Dress.jsx";
import Lightbox from "../components/Lightbox.jsx";

const GAME_SLUGS = ["mc", "genshin", "kog", "pubg", "stardew", "mobile"];
const PANEL_TITLE = {
  posts: "帖子",
  following: "关注",
  fans: "粉丝",
  replies: "回复",
  collect: "收藏",
  medals: "勋章",
  photos: "照片"
};

function possOf(user) {
  if (!user) return "TA的";
  if (user.gender === "女") return "她的";
  if (user.gender === "男") return "他的";
  return "TA的";
}

export default function User() {
  const { id, panel } = useParams();
  const { user, toast } = useAuth();
  const nav = useNavigate();
  const fileRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [replies, setReplies] = useState([]);
  const [collects, setCollects] = useState([]);
  const [following, setFollowing] = useState({ users: [], boards: [] });
  const [followers, setFollowers] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [shot, setShot] = useState(null);

  async function loadHome() {
    const d = await api(`/api/users/${id}`);
    setProfile(d.user);
    const ph = await api(`/api/users/${id}/photos`);
    setPhotos(ph.photos || []);
  }

  async function loadPanel(key) {
    if (key === "posts" || key === "reviews") {
      const p = await api(`/api/users/${id}/posts`);
      setPosts(p.posts || []);
    }
    if (key === "replies" || key === "reviews") {
      const r = await api(`/api/users/${id}/replies`);
      setReplies(r.replies || []);
    }
    if (key === "collect") {
      const c = await api(`/api/users/${id}/collects`);
      setCollects(c.posts || []);
    }
    if (key === "following") {
      const f = await api(`/api/users/${id}/following`);
      setFollowing({ users: f.users || [], boards: f.boards || [] });
    }
    if (key === "fans") {
      const fans = await api(`/api/users/${id}/followers`);
      setFollowers(fans.users || []);
    }
    if (key === "photos") {
      const ph = await api(`/api/users/${id}/photos`);
      setPhotos(ph.photos || []);
    }
  }

  useEffect(() => {
    setShot(null);
    loadHome().catch((e) => toast(e.message));
  }, [id]);

  useEffect(() => {
    if (!panel) return;
    loadPanel(panel).catch((e) => toast(e.message));
  }, [id, panel]);

  async function follow() {
    if (!user) return nav("/login");
    try {
      const d = await api(`/api/users/${id}/follow`, { method: "POST" });
      setProfile({ ...profile, followed: d.followed, fans: profile.fans + (d.followed ? 1 : -1) });
    } catch (e) {
      toast(e.message);
    }
  }

  async function addPhoto(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const fd = new FormData();
    fd.append("files", file);
    try {
      const up = await api("/api/upload", { method: "POST", body: fd });
      const url = (up.urls || [])[0];
      if (!url) return;
      const d = await api("/api/users/me/photos", { method: "POST", body: { url } });
      setPhotos((list) => [d.photo, ...list]);
      toast("照片已添加");
    } catch (err) {
      toast(err.message);
    }
  }

  async function dropPhoto(pid) {
    try {
      await api(`/api/users/me/photos/${pid}`, { method: "DELETE" });
      setPhotos((list) => list.filter((x) => x.id !== pid));
    } catch (err) {
      toast(err.message);
    }
  }

  if (!profile) return <div className="empty">空间加载中...</div>;

  const mine = user?.id === profile.id;
  const poss = mine ? "我的" : possOf(profile);
  const sex = profile.gender === "男" || profile.gender === "女" ? profile.gender : "";
  const album = photos.map((p) => p.url);

  if (panel && PANEL_TITLE[panel]) {
    const reviews = replies.filter((r) => GAME_SLUGS.includes(r.boardSlug));
    return (
      <div className="layout single">
        <div className="space-sub">
          <div className="space-sub-h">
            <button className="ico-btn dark" onClick={() => nav(`/user/${id}`)} aria-label="返回"><BackIco /></button>
            <b>{poss}{PANEL_TITLE[panel]}</b>
          </div>
          {panel === "posts" && posts.map((p) => <PostRow key={p.id} post={p} />)}
          {panel === "posts" && posts.length === 0 ? <div className="empty">还没有发帖</div> : null}
          {panel === "reviews" && reviews.map((r) => (
            <Link className="hx-row" key={r.id} to={`/post/${r.postId}`}>
              <div className="hx-row-body">
                <h3>{r.postTitle}</h3>
                <div className="ex">{r.floor}楼 · {r.content}</div>
              </div>
            </Link>
          ))}
          {panel === "reviews" && reviews.length === 0 ? <div className="empty">还没有游评</div> : null}
          {panel === "replies" && replies.map((r) => (
            <Link className="hx-row" key={r.id} to={`/post/${r.postId}`}>
              <div className="hx-row-body">
                <h3>{r.postTitle}</h3>
                <div className="ex">{r.floor}楼 · {r.content}</div>
              </div>
            </Link>
          ))}
          {panel === "replies" && replies.length === 0 ? <div className="empty">还没有回复</div> : null}
          {panel === "collect" && collects.map((p) => <PostRow key={p.id} post={p} />)}
          {panel === "collect" && collects.length === 0 ? <div className="empty">还没有收藏</div> : null}
          {panel === "medals" ? <MedalWall medals={profile.medalBag || profile.medals} empty="还没有点亮勋章" /> : null}
          {panel === "following" && following.users.map((u) => (
            <Link className="app-row pad" key={u.id} to={`/user/${u.id}`}>
              <UserAvatar user={u} size="sm" />
              <div className="grow"><b><UserName user={u} withLevel={false} /></b><div className="hint">{u.bio}</div></div>
            </Link>
          ))}
          {panel === "following" && following.users.length === 0 ? <div className="empty">还没有关注</div> : null}
          {panel === "fans" && followers.map((u) => (
            <Link className="app-row pad" key={u.id} to={`/user/${u.id}`}>
              <UserAvatar user={u} size="sm" />
              <div className="grow"><b><UserName user={u} withLevel={false} /></b><div className="hint">{u.bio}</div></div>
            </Link>
          ))}
          {panel === "fans" && followers.length === 0 ? <div className="empty">还没有粉丝</div> : null}
          {panel === "photos" ? (
            <div className="space-album pad">
              {photos.map((ph, i) => (
                <button type="button" key={ph.id} onClick={() => setShot(i)}>
                  <img src={ph.url} alt="" />
                </button>
              ))}
              {photos.length === 0 ? <p className="hint">还没有上传照片</p> : null}
            </div>
          ) : null}
          <Lightbox images={album} index={shot} onClose={() => setShot(null)} onIndex={setShot} />
        </div>
        <BackTop />
      </div>
    );
  }

  return (
    <div className="layout single">
      <div className="space-page">
        <div className={`space-cover${profile.dress && profile.dress.card ? ` has-card st-${profile.dress.card.style || "wash"}` : ""}`} style={cardVars(profile.dress && profile.dress.card)}>
          {profile.cover ? <img src={profile.cover} alt="" /> : <i className="space-cover-fall" />}
          <div className="space-tools">
            <button className="ico-btn" onClick={() => nav(-1)} aria-label="返回"><BackIco /></button>
            <b className="space-title">个人信息</b>
            {mine ? (
              <Link className="btn-pm ghost" to="/me?tab=profile">编辑</Link>
            ) : (
              <div className="me-cta">
                <button className={`btn-follow ${profile.followed ? "off" : ""}`} onClick={follow}>{profile.followed ? "已关注" : "关注"}</button>
                <Link className="btn-pm" to={user ? `/messages/chat/${profile.id}` : "/login"}>私信</Link>
                {user ? (
                  <button className="btn-pm ghost" onClick={async () => {
                    try {
                      const d = await api(`/api/users/${profile.id}/block`, { method: "POST" });
                      setProfile({ ...profile, blocked: d.blocked });
                      toast(d.blocked ? "已拉黑" : "已取消拉黑");
                    } catch (e) {
                      toast(e.message);
                    }
                  }}>{profile.blocked ? "取消拉黑" : "拉黑"}</button>
                ) : null}
              </div>
            )}
          </div>
        </div>
        <div className="space-id">
          <div className="space-id-row">
            <UserAvatar user={profile} size="xl" />
            <div className="space-id-txt">
              <h2><UserName user={profile} withLevel={false} /></h2>
              {profile.verifyTitle ? <p className="space-verify">{profile.verifyTitle}</p> : null}
              {profile.uin ? (
                <p className={`space-uin${profile.uinPretty ? " pretty" : ""}`}>
                  {profile.uinPretty ? <i className="pretty-mark">靓</i> : null}
                  青葫号 {profile.uin}
                </p>
              ) : null}
              <div className="space-id-tags">
                <LevelMark user={profile} />
                {sex ? <i className={`medal-dot sex ${sex === "女" ? "f" : "m"}`}>{sex}</i> : null}
                <HonorChips user={profile} />
              </div>
              <p className="space-wealth">
                <em>{profile.title}</em>
                贡献值 {formatHeat(profile.exp)}
                <i />
                葫芦 {formatHeat(profile.gourd)}
              </p>
            </div>
          </div>
        </div>
        <div className="space-stat">
          {[
            ["posts", profile.threadCount ?? profile.posts, "帖子"],
            ["following", profile.following, "关注"],
            ["fans", profile.fans, "粉丝"],
            ["replies", profile.replyCount ?? 0, "回复"],
            ["collect", profile.collectCount ?? 0, "收藏"]
          ].map(([key, n, label]) => (
            <button type="button" key={key} onClick={() => nav(`/user/${id}/${key}`)}>
              <b>{formatHeat(n)}</b><span>{label}</span>
            </button>
          ))}
        </div>
        <section className="space-sec">
          <div className="space-sec-h">
            <b>{poss}勋章</b>
            <button type="button" onClick={() => nav(`/user/${id}/medals`)}>全部</button>
          </div>
          {profile.medals && profile.medals.length ? (
            <MedalRow medals={profile.medals} max={8} />
          ) : <p className="hint">还没有点亮勋章</p>}
        </section>
        <section className="space-sec">
          <div className="space-sec-h">
            <b>{poss}照片</b>
            <span className="hint">{photos.length ? `${photos.length} 张` : ""}</span>
          </div>
          <div className="space-album">
            {photos.map((ph, i) => (
              <button type="button" key={ph.id} className="space-pic" onClick={() => setShot(i)}>
                <img src={ph.url} alt="" />
                {mine ? (
                  <em className="space-pic-x" onClick={(e) => { e.stopPropagation(); dropPhoto(ph.id); }}>×</em>
                ) : null}
              </button>
            ))}
            {mine && photos.length < 9 ? (
              <button type="button" className="space-pic add" onClick={() => fileRef.current && fileRef.current.click()}>+</button>
            ) : null}
          </div>
          {!photos.length && !mine ? <p className="hint">还没有上传照片</p> : null}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={addPhoto} />
        </section>
        <section className="space-sec space-bio">
          <p><span>签名</span>{profile.bio || "还没有签名"}</p>
          <p><span>家乡</span>{profile.hometown || profile.city || "未填写"}</p>
          <p><span>学校</span>{profile.school || "未填写"}</p>
        </section>
        <Lightbox images={album} index={shot} onClose={() => setShot(null)} onIndex={setShot} />
      </div>
      <BackTop />
    </div>
  );
}
