import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context.jsx";
import { PostRow } from "../components/PostCard.jsx";
import { BackIco } from "../icons.jsx";
import { LevelProgress, MedalRow, MedalWall, UserAvatar, UserName, WhoMeta } from "../components/Dress.jsx";
import BoardIcon from "../components/BoardIcon.jsx";

export default function User() {
  const { id } = useParams();
  const { user, toast } = useAuth();
  const nav = useNavigate();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [tab, setTab] = useState("posts");
  const [following, setFollowing] = useState({ users: [], boards: [] });
  const [followers, setFollowers] = useState([]);

  async function load() {
    const d = await api(`/api/users/${id}`);
    setProfile(d.user);
    const p = await api(`/api/users/${id}/posts`);
    setPosts(p.posts || []);
    const f = await api(`/api/users/${id}/following`);
    setFollowing({ users: f.users || [], boards: f.boards || [] });
    const fans = await api(`/api/users/${id}/followers`);
    setFollowers(fans.users || []);
  }

  useEffect(() => {
    setTab("posts");
    load().catch((e) => toast(e.message));
  }, [id]);

  async function follow() {
    if (!user) return nav("/login");
    const d = await api(`/api/users/${id}/follow`, { method: "POST" });
    setProfile({ ...profile, followed: d.followed, fans: profile.fans + (d.followed ? 1 : -1) });
  }

  if (!profile) return <div className="empty">空间加载中...</div>;

  return (
    <div className="layout single">
      <div className="me-page">
        <div className="me-hero">
          <div className="me-tools">
            <button className="ico-btn" onClick={() => nav(-1)} aria-label="返回"><BackIco /></button>
            <div className="grow" />
            {user?.id === profile.id ? null : (
              <div className="me-cta">
                <button className={`btn-follow ${profile.followed ? "off" : ""}`} onClick={follow}>{profile.followed ? "已关注" : "关注"}</button>
                <Link className="btn-pm" to={user ? `/messages/chat/${profile.id}` : "/login"}>私信</Link>
              </div>
            )}
          </div>
          <UserAvatar user={profile} size="xl" />
          <h2><UserName user={profile} /></h2>
          <MedalRow medals={profile.medals} max={6} />
          <p>{profile.bio || "这位葫芦丝还没签名"}</p>
          <LevelProgress user={profile} />
          <WhoMeta user={profile} />
          <div className="me-stat">
            <button type="button" onClick={() => setTab("following")}>
              <b>{profile.following}</b><span>关注</span>
            </button>
            <i />
            <button type="button" onClick={() => setTab("fans")}>
              <b>{profile.fans}</b><span>粉丝</span>
            </button>
          </div>
        </div>
        <div className="tabs">
          <button className={`tab ${tab === "posts" ? "on" : ""}`} onClick={() => setTab("posts")}>帖子</button>
          <button className={`tab ${tab === "medals" ? "on" : ""}`} onClick={() => setTab("medals")}>勋章</button>
          <button className={`tab ${tab === "following" ? "on" : ""}`} onClick={() => setTab("following")}>关注</button>
          <button className={`tab ${tab === "fans" ? "on" : ""}`} onClick={() => setTab("fans")}>粉丝</button>
        </div>
        {tab === "posts" && posts.map((p) => <PostRow key={p.id} post={p} />)}
        {tab === "posts" && posts.length === 0 ? <div className="empty">还没有发帖</div> : null}
        {tab === "medals" ? <MedalWall medals={profile.medals} empty="还没有点亮勋章" /> : null}
        {tab === "following" && following.users.map((u) => (
          <Link className="app-row pad" key={u.id} to={`/user/${u.id}`}>
            <UserAvatar user={u} size="sm" />
            <div className="grow"><b>{u.nickname}</b><div className="hint">{u.bio}</div></div>
          </Link>
        ))}
        {tab === "following" && following.boards.map((b) => (
          <Link className="app-row pad" key={"b" + b.id} to={`/board/${b.id}`}>
            <BoardIcon slug={b.slug} color={b.color} name={b.name} size={40} />
            <div className="grow"><b>{b.name}</b><div className="hint">{b.desc}</div></div>
          </Link>
        ))}
        {tab === "fans" && followers.map((u) => (
          <Link className="app-row pad" key={u.id} to={`/user/${u.id}`}>
            <UserAvatar user={u} size="sm" />
            <div className="grow"><b>{u.nickname}</b><div className="hint">{u.bio}</div></div>
          </Link>
        ))}
      </div>
    </div>
  );
}
