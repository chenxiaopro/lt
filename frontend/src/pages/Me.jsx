import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, getHistory } from "../api.js";
import { useAuth } from "../context.jsx";
import { PostRow } from "../components/PostCard.jsx";
import { GearIco, BackIco, PenIco, ChatIco, StarIco, ClockIco, GiftIco, UserIco, ChevronIco, RefreshIco, SoftIco, MusicIco, TrophyIco } from "../icons.jsx";
import { LevelProgress, MedalRow, MedalWall, UserAvatar, UserName, WhoMeta } from "../components/Dress.jsx";
import BoardIcon from "../components/BoardIcon.jsx";

export default function Me() {
  const { user, setUser, logout, toast } = useAuth();
  const nav = useNavigate();
  const [panel, setPanel] = useState(null);
  const [posts, setPosts] = useState([]);
  const [replies, setReplies] = useState([]);
  const [collects, setCollects] = useState([]);
  const [following, setFollowing] = useState({ users: [], boards: [] });
  const [followers, setFollowers] = useState([]);
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState({ nickname: "", bio: "", gender: "保密", city: "", birthday: "" });
  const [pw, setPw] = useState({ old: "", next: "", again: "" });
  const [geo, setGeo] = useState(null);

  useEffect(() => {
    if (!user) return nav("/login");
    setForm({ nickname: user.nickname, bio: user.bio, gender: user.gender, city: user.city, birthday: user.birthday || "" });
    api(`/api/users/${user.id}/posts`).then((d) => setPosts(d.posts || [])).catch(() => {});
    api(`/api/users/${user.id}/replies`).then((d) => setReplies(d.replies || [])).catch(() => {});
    api(`/api/users/${user.id}/collects`).then((d) => setCollects(d.posts || [])).catch(() => {});
    api(`/api/users/${user.id}/following`).then((d) => setFollowing({ users: d.users || [], boards: d.boards || [] })).catch(() => {});
    api(`/api/users/${user.id}/followers`).then((d) => setFollowers(d.users || [])).catch(() => {});
    setHistory(getHistory());
  }, [user]);

  useEffect(() => {
    api("/api/ip").then(setGeo).catch(() => {});
  }, []);

  async function save() {
    try {
      const d = await api("/api/users/me", { method: "PUT", body: form });
      setUser(d.user);
      setPanel(null);
      toast("资料已更新");
    } catch (e) {
      toast(e.message);
    }
  }

  async function onAvatar(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("files", file);
    try {
      const up = await api("/api/upload", { method: "POST", body: fd });
      const url = (up.urls || [])[0];
      if (!url) return;
      const d = await api("/api/users/me", { method: "PUT", body: { ...form, avatar: url } });
      setUser(d.user);
      toast("头像已更新");
    } catch (err) {
      toast(err.message);
    }
  }

  if (!user) return null;

  const threadPosts = posts.filter((p) => (p.board && p.board.slug) !== "pool");
  const menus = [
    { key: "posts", label: "我的帖子", count: threadPosts.length, color: "#f59e0b", ico: <PenIco size={18} /> },
    { key: "replies", label: "我的回复", count: replies.length, color: "#38bdf8", ico: <ChatIco size={18} /> },
    { key: "collect", label: "我的收藏", count: collects.length, color: "#fb7185", ico: <StarIco size={18} /> },
    { key: "history", label: "浏览历史", count: history.length, color: "#fbbf24", ico: <ClockIco size={18} /> },
    { key: "soft", label: "软件库", to: "/soft", color: "#60a5fa", ico: <SoftIco size={18} /> },
    { key: "music", label: "三楼电台", to: "/music", color: "#34d399", ico: <MusicIco size={18} /> },
    { key: "gift", label: "任务集市", to: "/discover", color: "#a78bfa", ico: <GiftIco size={18} /> },
    { key: "medals", label: "我的勋章", count: user.medals ? user.medals.length : 0, color: "#f59e0b", ico: <TrophyIco size={18} /> },
    ...(user.isAdmin ? [
      { key: "status", label: "服务器检查", to: "/status", color: "#64748b", ico: <RefreshIco size={18} /> },
      { key: "admin", label: "站务后台", to: "/admin", color: "#ff2442", ico: <GearIco size={18} /> }
    ] : [])
  ];

  if (panel) {
    const titles = {
      posts: "我的帖子",
      replies: "我的回复",
      collect: "我的收藏",
      history: "浏览历史",
      following: "关注",
      fans: "粉丝",
      profile: "个人信息",
      security: "账号与安全",
      medals: "我的勋章"
    };

    if (panel === "profile") {
      return (
        <div className="layout single">
          <div className="sheet">
            <div className="subhead">
              <button className="ico-btn dark" onClick={() => setPanel(null)} aria-label="返回"><BackIco /></button>
              <b>个人信息</b>
            </div>
            <div className="card me-sec">
              <div className="stack">
                <label className="field-lab">昵称
                  <input className="field" value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} placeholder="昵称" maxLength={16} />
                </label>
                <label className="field-lab">签名
                  <input className="field" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="这位葫芦丝还没签名" maxLength={80} />
                </label>
                <label className="field-lab">城市
                  <input className="field" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="城市" />
                </label>
                <label className="field-lab">性别
                  <select className="select" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                    <option>保密</option>
                    <option>男</option>
                    <option>女</option>
                  </select>
                </label>
                <label className="field-lab">生日
                  <input className="field" type="date" value={form.birthday || ""} onChange={(e) => setForm({ ...form, birthday: e.target.value })} />
                </label>
                <button className="btn btn-fill" onClick={save}>保存资料</button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (panel === "security") {
      return (
        <div className="layout single">
          <div className="sheet">
            <div className="subhead">
              <button className="ico-btn dark" onClick={() => setPanel(null)} aria-label="返回"><BackIco /></button>
              <b>账号与安全</b>
            </div>
            <div className="card me-sec">
              <div className="stack">
                <label className="field-lab">登录账号
                  <input className="field" value={user.username} readOnly />
                </label>
                <label className="field-lab">原密码
                  <input className="field" type="password" value={pw.old} onChange={(e) => setPw({ ...pw, old: e.target.value })} placeholder="当前密码" autoComplete="current-password" />
                </label>
                <label className="field-lab">新密码
                  <input className="field" type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} placeholder="至少 6 位" autoComplete="new-password" />
                </label>
                <label className="field-lab">确认新密码
                  <input className="field" type="password" value={pw.again} onChange={(e) => setPw({ ...pw, again: e.target.value })} placeholder="再输一次" autoComplete="new-password" />
                </label>
                <button className="btn btn-fill" onClick={async () => {
                  if (pw.next !== pw.again) return toast("两次新密码不一致");
                  try {
                    await api("/api/users/me/password", { method: "PUT", body: { oldPassword: pw.old, newPassword: pw.next } });
                    setPw({ old: "", next: "", again: "" });
                    toast("密码已更新");
                  } catch (e) {
                    toast(e.message);
                  }
                }}>更新密码</button>
                <button className="btn btn-line" onClick={() => { logout(); nav("/"); }}>退出登录</button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="layout single">
        <div className="sheet">
          <div className="subhead">
            <button className="ico-btn dark" onClick={() => setPanel(null)} aria-label="返回"><BackIco /></button>
            <b>{titles[panel]}</b>
          </div>
          {panel === "replies" && replies.map((r) => (
            <Link className="hx-row" key={r.id} to={`/post/${r.postId}`}>
              <div className="hx-row-body">
                <h3>{r.postTitle}</h3>
                <div className="ex">{r.floor}楼 · {r.content}</div>
              </div>
            </Link>
          ))}
          {panel === "posts" && threadPosts.map((p) => <PostRow key={p.id} post={p} />)}
          {panel === "collect" && collects.map((p) => <PostRow key={p.id} post={p} />)}
          {panel === "history" && history.map((h) => (
            <Link className="hx-row" key={h.id} to={`/post/${h.id}`}>
              {h.cover ? <img className="hx-thumb" src={h.cover} alt="" /> : null}
              <div className="hx-row-body">
                <h3>{h.title}</h3>
                <div className="ex">{h.content}</div>
              </div>
            </Link>
          ))}
          {panel === "following" && (
            <>
              {following.users.map((u) => (
                <Link className="app-row" key={"u" + u.id} to={`/user/${u.id}`}>
                  <UserAvatar user={u} size="sm" />
                  <div className="grow">
                    <b>{u.nickname}</b>
                    <div className="hint">{u.bio || "还没有签名"}</div>
                  </div>
                </Link>
              ))}
              {following.boards.map((b) => (
                <Link className="app-row" key={"b" + b.id} to={`/board/${b.id}`}>
                  <BoardIcon slug={b.slug} color={b.color} name={b.name} size={40} />
                  <div className="grow">
                    <b>{b.name}</b>
                    <div className="hint">{b.desc}</div>
                  </div>
                </Link>
              ))}
            </>
          )}
          {panel === "fans" && followers.map((u) => (
            <Link className="app-row" key={u.id} to={`/user/${u.id}`}>
              <UserAvatar user={u} size="sm" />
              <div className="grow">
                <b>{u.nickname}</b>
                <div className="hint">{u.bio || "还没有签名"}</div>
              </div>
            </Link>
          ))}
          {panel === "medals" ? (
            <MedalWall
              medals={user.medalBag || user.medals}
              empty="发帖、签到、回帖会点亮勋章"
              onToggle={async (m) => {
                const bag = user.medalBag || user.medals || [];
                let worn = bag.filter((x) => x.equipped).map((x) => x.slug);
                if (m.equipped) worn = worn.filter((s) => s !== m.slug);
                else {
                  if (worn.length >= 5) return toast("最多佩戴 5 枚，先卸下一枚");
                  worn = [...worn, m.slug];
                }
                try {
                  const d = await api("/api/users/me/medals", { method: "PUT", body: { slugs: worn } });
                  setUser(d.user);
                } catch (e) {
                  toast(e.message);
                }
              }}
            />
          ) : null}
          {emptyPanel(panel, { posts: threadPosts, replies, collects, history, following, followers }) ? (
            <div className="empty">这里还是空的</div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="layout single">
      <div className="me-page">
        <div className="me-hero">
          <div className="me-tools">
            <button className="ico-btn" onClick={() => setPanel("security")} aria-label="设置"><GearIco /></button>
            <div className="grow" />
          </div>
          <label className="avatar-edit">
            <UserAvatar user={user} size="xl" />
            <input type="file" accept="image/*" hidden onChange={onAvatar} />
          </label>
          <h2><UserName user={user} /></h2>
          <MedalRow medals={user.medals} max={6} />
          <p>{user.bio || "这位葫芦丝还没签名"}</p>
          <LevelProgress user={user} compact />
          <WhoMeta user={user} />
          {geo ? (
            <p className="ip-geo">
              IP属地 {[geo.country, geo.province, geo.city, geo.county].filter(Boolean).join(" ") || geo.label}
            </p>
          ) : null}
          <div className="me-stat">
            <button type="button" onClick={() => setPanel("following")}>
              <b>{user.following}</b><span>关注</span>
            </button>
            <i />
            <button type="button" onClick={() => setPanel("fans")}>
              <b>{user.fans}</b><span>粉丝</span>
            </button>
          </div>
        </div>
        <div className="me-list">
          {menus.map((m) => (
            m.to ? (
              <Link className="me-item" key={m.key} to={m.to}>
                <span className="me-ico" style={{ background: m.color }}>{m.ico}</span>
                <b>{m.label}</b>
                <em>{m.count ?? ""}</em>
                <ChevronIco size={16} />
              </Link>
            ) : (
              <button className="me-item" key={m.key} onClick={() => setPanel(m.key)}>
                <span className="me-ico" style={{ background: m.color }}>{m.ico}</span>
                <b>{m.label}</b>
                <em>{m.count}</em>
                <ChevronIco size={16} />
              </button>
            )
          ))}
          <button className="me-item" onClick={() => setPanel("profile")}>
            <span className="me-ico" style={{ background: "#22c55e" }}><UserIco size={18} /></span>
            <b>个人信息</b>
            <em>性别 / 生日</em>
            <ChevronIco size={16} />
          </button>
          <button className="me-item" onClick={() => setPanel("security")}>
            <span className="me-ico" style={{ background: "#64748b" }}><GearIco size={18} /></span>
            <b>账号与安全</b>
            <em>密码 / 退出</em>
            <ChevronIco size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function emptyPanel(panel, data) {
  if (panel === "posts") return data.posts.length === 0;
  if (panel === "replies") return data.replies.length === 0;
  if (panel === "collect") return data.collects.length === 0;
  if (panel === "history") return data.history.length === 0;
  if (panel === "following") return data.following.users.length + data.following.boards.length === 0;
  if (panel === "fans") return data.followers.length === 0;
  return false;
}
