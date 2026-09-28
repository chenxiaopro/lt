import React, { useEffect, useState } from "react";
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { api } from "./api.js";
import { AuthProvider, useAuth } from "./context.jsx";
import Home from "./pages/Home.jsx";
import Community from "./pages/Community.jsx";
import Board from "./pages/Board.jsx";
import BoardRules from "./pages/BoardRules.jsx";
import Post from "./pages/Post.jsx";
import Publish from "./pages/Publish.jsx";
import Discover from "./pages/Discover.jsx";
import Messages from "./pages/Messages.jsx";
import Me from "./pages/Me.jsx";
import User from "./pages/User.jsx";
import Auth from "./pages/Auth.jsx";
import Setup from "./pages/Setup.jsx";
import Search from "./pages/Search.jsx";
import AddBoards from "./pages/AddBoards.jsx";
import Status from "./pages/Status.jsx";
import Admin from "./pages/Admin.jsx";
import { HomeIco, GridIco, BellIco, UserIco, SearchIco, PenIco, BackIco, PlusIco, CloseIco, ShopIco, ImageIco, SoftIco } from "./icons.jsx";
import Software from "./pages/Software.jsx";
import Music from "./pages/Music.jsx";
import NowPlaying from "./pages/NowPlaying.jsx";
import Level from "./pages/Level.jsx";
import { MiniPlayer, PlayerProvider } from "./components/Player.jsx";

export function Toast({ text, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1800);
    return () => clearTimeout(t);
  }, [onDone]);
  if (!text) return null;
  return <div className="toast">{text}</div>;
}

function Layout({ children }) {
  const { user, site } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [unread, setUnread] = useState(0);
  const [composeOpen, setComposeOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api("/api/notifications").catch(() => ({ unread: 0 })),
      api("/api/dms").catch(() => ({ unread: 0 }))
    ]).then(([n, d]) => setUnread((n.unread || 0) + (d.unread || 0)));
  }, [user, loc.pathname]);

  useEffect(() => {
    setComposeOpen(false);
  }, [loc.pathname, loc.search]);

  const p = loc.pathname;
  const hideBar = p.startsWith("/user/");
  const isCommunity = p === "/community";
  const isAdd = p === "/boards/add";
  const isBoard = p.startsWith("/board/");
  const isRules = /\/board\/[^/]+\/rules$/.test(p);
  const isMsg = p === "/messages" || p.startsWith("/messages/");
  const isChat = p.startsWith("/messages/chat/");
  const isDiscover = p === "/discover";
  const isHome = p === "/";
  const isMe = p === "/me";
  const isSearch = p === "/search";
  const isPublish = p === "/publish";
  const isPost = p.startsWith("/post/");
  const isStatus = p === "/status";
  const isAdmin = p === "/admin";
  const qs = new URLSearchParams(loc.search);
  const isMoment = isHome && qs.get("view") === "moment";
  const isSoft = p === "/soft" || p.startsWith("/soft/");
  const isSoftDetail = /^\/soft\/\d+/.test(p);
  const isMusicNow = p === "/music/now";
  const isMusic = p === "/music" || isMusicNow;
  const isLevel = p === "/level";
  const inbox = isMsg && qs.get("inbox") === "1";
  const hideNav = isPost || isChat || isMusicNow;
  const showCluster = isHome || (isSoft && !isSoftDetail);

  function openCompose() {
    if (!user) {
      nav("/login");
      return;
    }
    setComposeOpen((v) => !v);
  }

  const titles = isCommunity
    ? "社区"
    : isAdd
      ? "添加版块"
      : isRules
        ? "版规"
        : isBoard
        ? "版块"
        : isMsg
          ? (qs.get("inbox") === "1" ? "互动消息" : "消息")
          : isDiscover
            ? "集市"
            : isMe
              ? "我的"
              : isPublish
                ? ({ moment: "发动态", goods: "发商品", software: "发软件" }[qs.get("type")] || "发帖")
                : isPost
                  ? "帖子"
                  : isSearch
                    ? "搜索"
                    : isStatus
                      ? "服务器检查"
                      : isAdmin
                        ? "站务后台"
                        : isSoftDetail
                          ? "软件"
                          : isSoft
                            ? "软件库"
                            : isMusic
                              ? (isMusicNow ? "正在播放" : "电台")
                              : isLevel
                                ? "等级"
                    : (site && site.name) || "青葫三楼";

  const composeItems = [
    { to: "/publish?type=moment", label: "动态", ico: <ImageIco size={22} />, color: "#34d399" },
    { to: "/publish", label: "发帖", ico: <PenIco size={22} />, color: "#ff2442" },
    { to: "/publish?type=goods", label: "发商品", ico: <ShopIco size={22} />, color: "#fbbf24" },
    { to: "/publish?type=software", label: "发软件", ico: <SoftIco size={22} />, color: "#60a5fa" }
  ];

  return (
    <div className={`app-shell lucky ${hideBar ? "no-top" : ""} ${hideNav ? "post-open" : ""} ${isChat ? "chat-open" : ""} ${composeOpen ? "compose-on" : ""}`}>
      {hideBar ? null : (
        <header className="topbar">
          <div className="topbar-inner">
            <Link className="brand desk-only" to="/">
              <div className="brand-mark">{((site && site.name) || "青").slice(0, 1)}</div>
              <div>
                <h1>{(site && site.name) || "青葫三楼"}</h1>
                <p>{(site && site.tagline) || "幸运、趣事尽在青葫社区"}</p>
              </div>
            </Link>
            <nav className="desk-nav desk-only">
              <NavLink to="/" end className={({ isActive }) => (isActive ? "on" : "")}>首页</NavLink>
              <NavLink to="/community" className={({ isActive }) => (isActive ? "on" : "")}>圈子</NavLink>
              <NavLink to="/soft" className={({ isActive }) => (isActive ? "on" : "")}>软件</NavLink>
              <NavLink to="/messages" className={({ isActive }) => (isActive ? "on" : "")}>
                消息{unread ? <i className="nav-dot">{unread > 99 ? "99+" : unread}</i> : null}
              </NavLink>
              <NavLink to="/me" className={({ isActive }) => (isActive ? "on" : "")}>我的</NavLink>
            </nav>
            {isAdd || isBoard || isPublish || isPost || isSearch || isStatus || isAdmin || isSoftDetail || inbox || isRules || isLevel || isMusicNow ? (
              <button className="ico-btn" onClick={() => nav(-1)} aria-label="返回">
                <BackIco />
              </button>
            ) : (
              <span className="top-deco" aria-hidden />
            )}
            {showCluster ? (
              <div className="top-tabs inline">
                <Link to="/" className={isHome && !isMoment ? "on" : ""}>首页</Link>
                <Link to="/soft" className={isSoft && !isSoftDetail ? "on" : ""}>软件</Link>
                <Link to="/?view=moment" className={isMoment ? "on" : ""}>此刻</Link>
              </div>
            ) : (
              <div className="page-title">{titles}</div>
            )}
            <div className="top-actions">
              {isCommunity ? (
                <Link className="ico-btn" to="/boards/add" aria-label="添加版块">
                  <PlusIco />
                </Link>
              ) : isPublish || isSearch || isStatus || isAdmin || inbox ? (
                <span className="top-deco" aria-hidden />
              ) : (
                <button className="ico-btn" onClick={() => nav("/search")} aria-label="搜索">
                  <SearchIco />
                </button>
              )}
              <Link className="btn btn-gourd desk-only" to={user ? "/publish" : "/login"}>发帖</Link>
              {user ? (
                <Link className="mini-user desk-only" to="/me">
                  <img className="avatar" src={user.avatar} alt="" />
                  <span>{user.nickname}</span>
                </Link>
              ) : (
                <Link className="btn btn-ghost desk-only" to="/login">登录</Link>
              )}
            </div>
          </div>
        </header>
      )}
      {children}
      <MiniPlayer hidden={hideNav} />
      {composeOpen ? (
        <div className="compose-mask" onClick={() => setComposeOpen(false)}>
          <div className="compose-sheet" onClick={(e) => e.stopPropagation()}>
            <i className="sheet-handle" />
            {composeItems.map((item) => (
              <button key={item.label} type="button" onClick={() => { setComposeOpen(false); nav(item.to); }}>
                <span style={{ background: item.color }}>{item.ico}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {hideNav ? null : (
      <nav className="bottom-nav">
        <NavLink to="/" end className={({ isActive }) => (isActive ? "on" : "")}>
          <HomeIco size={20} />
          首页
        </NavLink>
        <NavLink to="/community" className={({ isActive }) => (isActive ? "on" : "")}>
          <GridIco size={20} />
          圈子
        </NavLink>
        <button type="button" className={`fab-wrap ${composeOpen ? "open" : ""}`} onClick={openCompose} aria-label="发布">
          <span className="fab">{composeOpen ? <CloseIco size={22} /> : <PlusIco size={22} />}</span>
        </button>
        <NavLink to="/messages" className={({ isActive }) => (isActive ? "on" : "")}>
          <span className="badge-wrap">
            <BellIco size={20} />
            {unread ? <i className="nav-dot">{unread > 99 ? "99+" : unread}</i> : null}
          </span>
          消息
        </NavLink>
        <NavLink to="/me" className={({ isActive }) => (isActive ? "on" : "")}>
          <UserIco size={20} />
          我的
        </NavLink>
      </nav>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PlayerProvider>
        <AppRoutes />
      </PlayerProvider>
    </AuthProvider>
  );
}

function AppRoutes() {
  const { ready, toastText, clearToast, site } = useAuth();
  const loc = useLocation();
  useEffect(() => {
    if (site && site.name) document.title = site.name;
  }, [site]);
  if (!ready) return <div className="empty">三楼点灯中...</div>;
  if (site && site.installed === false && loc.pathname !== "/setup") {
    return <Navigate to="/setup" replace />;
  }
  return (
    <>
      <Routes>
        <Route path="/setup" element={<Setup />} />
        <Route path="/login" element={<Auth mode="login" />} />
        <Route path="/register" element={<Auth mode="register" />} />
        <Route
          path="*"
          element={
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/community" element={<Community />} />
                <Route path="/boards/add" element={<AddBoards />} />
                <Route path="/board/:id/rules" element={<BoardRules />} />
                <Route path="/board/:id" element={<Board />} />
                <Route path="/post/:id" element={<Post />} />
                <Route path="/publish" element={<Publish />} />
                <Route path="/discover" element={<Discover />} />
                <Route path="/soft" element={<Software />} />
                <Route path="/soft/:id" element={<Software />} />
                <Route path="/music" element={<Music />} />
                <Route path="/music/now" element={<NowPlaying />} />
                <Route path="/level" element={<Level />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/messages/chat/:uid" element={<Messages />} />
                <Route path="/me" element={<Me />} />
                <Route path="/user/:id" element={<User />} />
                <Route path="/search" element={<Search />} />
                <Route path="/status" element={<Status />} />
                <Route path="/admin" element={<Admin />} />
              </Routes>
            </Layout>
          }
        />
      </Routes>
      <Toast text={toastText} onDone={clearToast} />
    </>
  );
}
