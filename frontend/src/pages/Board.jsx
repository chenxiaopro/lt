import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context.jsx";
import { PinRow, PostRow } from "../components/PostCard.jsx";
import { BackTop, useInfiniteScroll } from "../components/ListScroll.jsx";
import { formatHeat } from "../api.js";
import BoardIcon from "../components/BoardIcon.jsx";
import { FeedSkeleton } from "../components/Skeleton.jsx";

export default function Board() {
  const { id } = useParams();
  const { user, toast } = useAuth();
  const nav = useNavigate();
  const [board, setBoard] = useState(null);
  const [tab, setTab] = useState("reply");
  const [posts, setPosts] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [pageOff, setPageOff] = useState(0);
  const [typeId, setTypeId] = useState(0);
  const [manage, setManage] = useState(false);
  const [picked, setPicked] = useState([]);
  const [busy, setBusy] = useState(false);
  const [boardOpts, setBoardOpts] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);

  async function load({ more } = {}) {
    const b = await api(`/api/boards/${id}`);
    setBoard(b.board);
    const offset = more ? pageOff : 0;
    const typeQ = typeId ? `&typeId=${typeId}` : "";
    const p = await api(`/api/posts?boardId=${id}&tab=${tab}&limit=30&offset=${offset}${typeQ}`);
    const list = p.posts || [];
    setPosts((prev) => {
      if (!more) return list;
      const seen = new Set(prev.map((x) => x.id));
      return prev.concat(list.filter((x) => !seen.has(x.id)));
    });
    setPageOff(offset + 30);
    setHasMore(!!p.hasMore);
  }

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      await load({ more: true });
    } catch (e) {
      toast(e.message);
    } finally {
      setLoadingMore(false);
    }
  }

  const listSentinel = useInfiniteScroll({ hasMore, loadingMore, ready: !!board, onLoadMore: loadMore });

  useEffect(() => {
    setPageOff(0);
    setPicked([]);
    load().catch((e) => toast(e.message));
  }, [id, tab, typeId]);

  useEffect(() => {
    setTypeId(0);
  }, [id]);

  const canMod = !!user && !!board && (user.isAdmin || (user.modBoardIds || []).includes(board.id));

  useEffect(() => {
    if (!manage || !canMod || boardOpts.length) return;
    api("/api/boards").then((d) => setBoardOpts(d.boards || [])).catch(() => setBoardOpts([]));
  }, [manage, canMod]);

  function togglePick(pid) {
    setPicked((list) => list.includes(pid) ? list.filter((x) => x !== pid) : [...list, pid]);
  }

  async function runBatch(action, extra, ask) {
    if (!picked.length) return toast("先勾选帖子");
    if (ask && !window.confirm(ask)) return;
    setBusy(true);
    try {
      const d = await api("/api/posts/batch", { method: "POST", body: { ids: picked, action, ...(extra || {}) } });
      toast(`已处理 ${d.count ?? picked.length} 帖`);
      setPicked([]);
      await load();
    } catch (e) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function follow() {
    if (!user) return nav("/login");
    try {
      const d = await api(`/api/boards/${id}/follow`, { method: "POST" });
      setBoard({ ...board, followed: d.followed, followCount: board.followCount + (d.followed ? 1 : -1) });
    } catch (e) {
      toast(e.message);
    }
  }

  if (!board) return <div className="layout single"><FeedSkeleton n={5} /></div>;

  const canEdit = !!user && (user.isAdmin || (user.modBoardIds || []).includes(board.id));
  const pins = posts.filter((p) => p.pinned || p.official);
  const feed = posts.filter((p) => !p.pinned && !p.official);

  return (
    <div className="layout single">
      <div className="board-page">
        <div className="hx-hero" style={{ background: `linear-gradient(180deg, ${board.color}33, #fff 72%)` }}>
          <BoardIcon slug={board.slug} color={board.color} name={board.name} size={64} />
          <div className="grow">
            <h2>{board.name}</h2>
            {board.desc ? <p className="board-desc">{board.desc}</p> : null}
            <div className="stats-line">
              <span>热度 {formatHeat(board.heat)}</span>
              <span>话题 {formatHeat(board.topics || board.postCount)}</span>
              <span>关注 {formatHeat(board.followCount)}</span>
            </div>
            <div className="mods">版主 {(board.moderators || []).join("、") || "暂无"}</div>
          </div>
          <button className={`btn-follow ${board.followed ? "off" : ""}`} onClick={follow}>
            {board.followed ? "已关注" : "关注"}
          </button>
        </div>
        <div className="sort-bar">
          <div className="hx-sort">
            {[
              ["reply", "最新回复"],
              ["latest", "最新发帖"],
              ["hot", "热门"],
              ["essence", "精华"]
            ].map(([k, label]) => (
              <button key={k} type="button" className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{label}</button>
            ))}
          </div>
          <div className="sort-actions">
            <Link className="rules-link" to={`/board/${id}/rules`}>版规</Link>
            {canMod ? (
              <button className={`btn${manage ? " btn-fill" : ""}`} onClick={() => { setManage((m) => !m); setPicked([]); }}>{manage ? "退出管理" : "管理"}</button>
            ) : null}
            <button className="btn btn-fill" onClick={() => nav(user ? `/publish?board=${id}` : "/login")}>发帖</button>
          </div>
        </div>
        {(board.threadTypes || []).length ? (
          <div className="type-bar">
            <button type="button" className={typeId ? "" : "on"} onClick={() => setTypeId(0)}>全部</button>
            {board.threadTypes.map((t) => (
              <button key={t.id} type="button" className={typeId === t.id ? "on" : ""} onClick={() => setTypeId(t.id)}>{t.name}</button>
            ))}
          </div>
        ) : null}
        {board.announcement ? (
          <div className="board-notice">
            <b>版块公告</b>
            <span>{board.announcement}</span>
            {canEdit ? <Link className="board-notice-edit" to={`/board/${id}/rules`}>编辑</Link> : null}
          </div>
        ) : null}
        {manage ? (
          <div className="batch-bar">
            <button type="button" className="batch-all" onClick={() => setPicked(picked.length ? [] : posts.map((p) => p.id))}>
              {picked.length === posts.length && posts.length ? "取消全选" : "全选"}
            </button>
            <span className="batch-count">已选 {picked.length}</span>
            <div className="batch-acts">
              <button type="button" disabled={busy || !picked.length} onClick={() => runBatch("essence", { value: 1 })}>加精</button>
              <button type="button" disabled={busy || !picked.length} onClick={() => runBatch("essence", { value: 0 })}>取消精</button>
              <button type="button" disabled={busy || !picked.length} onClick={() => runBatch("pin", { value: 1 })}>置顶</button>
              <button type="button" disabled={busy || !picked.length} onClick={() => runBatch("pin", { value: 0 })}>取消顶</button>
              <button type="button" disabled={busy || !picked.length} onClick={() => runBatch("lock", { value: 1 })}>锁定</button>
              <button type="button" disabled={busy || !picked.length} onClick={() => runBatch("lock", { value: 0 })}>解锁</button>
              <button type="button" disabled={busy || !picked.length} onClick={() => runBatch("hot", { value: 1 })}>设热</button>
              <button type="button" disabled={busy || !picked.length} onClick={() => runBatch("hot", { value: 0 })}>取消热</button>
              <select className="batch-move" value="" disabled={busy || !picked.length} onChange={(e) => { const v = e.target.value; e.target.value = ""; if (!v) return; runBatch("highlight", { color: v === "none" ? "" : v }); }}>
                <option value="">高亮</option>
                <option value="none">清除</option>
                <option value="red">红</option>
                <option value="orange">橙</option>
                <option value="green">绿</option>
                <option value="blue">蓝</option>
                <option value="purple">紫</option>
              </select>
              <select className="batch-move" value="" disabled={busy || !picked.length} onChange={(e) => { const v = e.target.value; e.target.value = ""; if (v) runBatch("move", { boardId: Number(v) }); }}>
                <option value="">移动</option>
                {boardOpts.filter((b) => b.id !== board.id && (user?.isAdmin || (user?.modBoardIds || []).includes(b.id))).map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <button type="button" className="danger" disabled={busy || !picked.length} onClick={() => runBatch("delete", null, `确认将选中 ${picked.length} 帖移入回收站？`)}>删除</button>
            </div>
          </div>
        ) : null}
        {pins.map((p) => <PinRow key={p.id} post={p} pickable={manage} picked={picked.includes(p.id)} onPick={togglePick} />)}
        {feed.map((p) => <PostRow key={p.id} post={p} pickable={manage} picked={picked.includes(p.id)} onPick={togglePick} />)}
        {feed.length === 0 && pins.length === 0 ? <div className="empty">{tab === "essence" ? "这一层还没有精华帖" : "这层楼还没人说话"}</div> : null}
        {hasMore ? (
          <>
            <div ref={listSentinel} className="load-sentinel" aria-hidden="true" />
            <button type="button" className="btn btn-line touch-act" onClick={loadMore}>{loadingMore ? "加载中" : "加载更多"}</button>
          </>
        ) : null}
      </div>
      <BackTop />
    </div>
  );
}
