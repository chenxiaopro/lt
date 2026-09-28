import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context.jsx";
import { UserAvatar } from "../components/Dress.jsx";

const ROLE_LEGEND = [
  ["站长", "全部权限：任命管理员、重置密码、重置社区"],
  ["管理员", "管理用户、版主、勋章称号、折叠帖"],
  ["版主", "管理所在版块：折叠帖、编辑版规"],
  ["用户", "发帖、评论、私信"]
];

export default function Admin() {
  const { user, toast, login, setSite } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("new");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [banHours, setBanHours] = useState(168);
  const [muteHours, setMuteHours] = useState(24);
  const [boards, setBoards] = useState([]);
  const [hidden, setHidden] = useState([]);
  const [picked, setPicked] = useState(null);
  const [modQ, setModQ] = useState("");
  const [hits, setHits] = useState([]);
  const [boardId, setBoardId] = useState("");
  const [honors, setHonors] = useState([]);
  const [medalDefs, setMedalDefs] = useState([]);
  const [levels, setLevels] = useState([]);
  const [rules, setRules] = useState([]);
  const [logs, setLogs] = useState([]);
  const [honorQ, setHonorQ] = useState("");
  const [honorHits, setHonorHits] = useState([]);
  const [honorPicked, setHonorPicked] = useState(null);
  const [honorBoard, setHonorBoard] = useState("");
  const [honorTitle, setHonorTitle] = useState("");
  const [honorColor, setHonorColor] = useState("#38bdf8");
  const [grantKey, setGrantKey] = useState("");
  const [grantSlug, setGrantSlug] = useState("");
  const [boardForm, setBoardForm] = useState({ name: "", slug: "", icon: "", color: "#FF6A00", desc: "", category: "生活综合" });
  const [editBoardId, setEditBoardId] = useState(null);
  const [newMedal, setNewMedal] = useState({ name: "", icon: "", color: "#ff2442", desc: "" });
  const [editing, setEditing] = useState(null);
  const [fresh, setFresh] = useState({
    siteName: "青葫三楼",
    tagline: "幸运、趣事尽在社区",
    username: "admin",
    nickname: "站长",
    password: "",
    confirm: ""
  });

  async function load() {
    const o = await api("/api/admin/overview");
    setStats(o);
    const b = await api("/api/admin/boards");
    setBoards(b.boards || []);
    const p = await api("/api/admin/posts?hidden=1");
    setHidden(p.posts || []);
    const h = await api("/api/admin/honors");
    setHonors(h.honors || []);
    const m = await api("/api/admin/medals");
    setMedalDefs(m.medals || []);
    const lv = await api("/api/levels");
    setLevels(lv.levels || []);
    setRules(lv.rules || []);
    api("/api/admin/logs")
      .then((d) => setLogs(d.logs || []))
      .catch(() => setLogs([]));
  }

  async function fetchUsers(pg = page) {
    const p = new URLSearchParams({ filter, sort, page: String(pg) });
    if (q.trim()) p.set("q", q.trim());
    const d = await api(`/api/admin/users?${p.toString()}`);
    setUsers(d.users || []);
    setTotal(d.total || 0);
  }

  useEffect(() => {
    if (!user) return nav("/login");
    if (!user.isAdmin) {
      toast("需要管理员权限");
      return nav("/me");
    }
    load().catch((e) => toast(e.message));
  }, [user]);

  useEffect(() => {
    if (user?.isAdmin) fetchUsers().catch((e) => toast(e.message));
  }, [filter, sort, page, user]);

  async function search(e) {
    e.preventDefault();
    setPage(0);
    fetchUsers(0).catch((e) => toast(e.message));
  }

  async function setRole(id, role) {
    try {
      const tip = role === "admin" ? "确认设为管理员？" : "确认取消管理员？";
      if (!window.confirm(tip)) return;
      const d = await api(`/api/admin/users/${id}/role`, { method: "POST", body: { role } });
      setUsers((list) => list.map((u) => (u.id === id ? d.user : u)));
      toast(role === "admin" ? "已设为管理员" : "已降为普通用户");
    } catch (e) {
      toast(e.message);
    }
  }

  async function ban(id, hours) {
    try {
      const tip = hours ? `确认封禁该用户 ${hours} 小时？` : "确认解除封禁？";
      if (!window.confirm(tip)) return;
      const d = await api(`/api/admin/users/${id}/ban`, { method: "POST", body: { hours } });
      setUsers((list) => list.map((u) => (u.id === id ? d.user : u)));
      toast(hours ? "已封禁" : "已解封");
      load().catch(() => {});
    } catch (e) {
      toast(e.message);
    }
  }

  async function mute(id, hours) {
    try {
      const tip = hours ? `确认全站禁言 ${hours} 小时？` : "确认解除禁言？";
      if (!window.confirm(tip)) return;
      const d = await api(`/api/admin/users/${id}/mute`, { method: "POST", body: { hours } });
      setUsers((list) => list.map((u) => (u.id === id ? d.user : u)));
      toast(hours ? "已全站禁言" : "已解除禁言");
      load().catch(() => {});
    } catch (e) {
      toast(e.message);
    }
  }

  async function searchStaff(e) {
    e.preventDefault();
    const key = modQ.trim();
    if (!key) return toast("输入昵称或账号");
    try {
      const d = await api(`/api/admin/users?q=${encodeURIComponent(key)}`);
      setHits(d.users || []);
      if (!(d.users || []).length) toast("没有找到这个人");
    } catch (err) {
      toast(err.message);
    }
  }

  function pickUser(u) {
    setPicked(u);
    setHits([]);
    setModQ(u.nickname);
  }

  async function addMod() {
    if (!picked) return toast("先搜人并点选");
    if (!boardId) return toast("选择要授权的版块");
    try {
      await api(`/api/admin/boards/${boardId}/mods`, { method: "POST", body: { userId: picked.id } });
      const b = await api("/api/admin/boards");
      setBoards(b.boards || []);
      toast(`已任命 ${picked.nickname}`);
    } catch (e) {
      toast(e.message);
    }
  }

  async function dropMod(boardId, userId) {
    try {
      if (!window.confirm("确认撤下该版主？")) return;
      await api(`/api/admin/boards/${boardId}/mods/${userId}`, { method: "DELETE" });
      const b = await api("/api/admin/boards");
      setBoards(b.boards || []);
      toast("已撤下版主");
    } catch (e) {
      toast(e.message);
    }
  }

  async function saveBoard() {
    if (!boardForm.name.trim()) return toast("请填写版块名称");
    try {
      if (editBoardId) {
        await api(`/api/admin/boards/${editBoardId}`, { method: "PUT", body: boardForm });
        toast("版块已更新");
      } else {
        await api("/api/admin/boards", { method: "POST", body: boardForm });
        toast("版块已创建");
      }
      setEditBoardId(null);
      setBoardForm({ name: "", slug: "", icon: "", color: "#FF6A00", desc: "", category: "生活综合" });
      const b = await api("/api/admin/boards");
      setBoards(b.boards || []);
      load().catch(() => {});
    } catch (e) {
      toast(e.message);
    }
  }

  function openEditBoard(b) {
    setEditBoardId(b.id);
    setBoardForm({
      name: b.name,
      slug: b.slug,
      icon: b.icon || "",
      color: b.color || "#FF6A00",
      desc: b.desc || "",
      category: b.category || "生活综合"
    });
  }

  async function delBoard(b) {
    if (!window.confirm(`确认删除版块「${b.name}」？该版所有帖子将被删除。`)) return;
    try {
      await api(`/api/admin/boards/${b.id}`, { method: "DELETE" });
      const d = await api("/api/admin/boards");
      setBoards(d.boards || []);
      toast("版块已删除");
      load().catch(() => {});
    } catch (e) {
      toast(e.message);
    }
  }

  async function unhide(id) {
    try {
      await api(`/api/posts/${id}/moderate`, { method: "POST", body: { action: "hide" } });
      setHidden((list) => list.filter((p) => p.id !== id));
      toast("已取消折叠");
    } catch (e) {
      toast(e.message);
    }
  }

  async function searchHonor(e) {
    e.preventDefault();
    const key = honorQ.trim();
    if (!key) return toast("输入昵称或账号");
    try {
      const d = await api(`/api/admin/users?q=${encodeURIComponent(key)}`);
      setHonorHits(d.users || []);
      if (!(d.users || []).length) toast("没有找到这个人");
    } catch (err) {
      toast(err.message);
    }
  }

  async function saveHonor() {
    if (!honorPicked) return toast("先搜人并点选");
    if (!honorBoard) return toast("选择版块");
    if (!honorTitle.trim()) return toast("填写称号");
    try {
      await api("/api/admin/honors", {
        method: "POST",
        body: { userId: honorPicked.id, boardId: honorBoard, honor: honorTitle, honorColor: honorColor }
      });
      const h = await api("/api/admin/honors");
      setHonors(h.honors || []);
      toast("称号已保存");
    } catch (e) {
      toast(e.message);
    }
  }

  async function dropHonor(row) {
    try {
      await api(`/api/admin/honors?userId=${row.userId}&boardId=${row.boardId}`, { method: "DELETE" });
      setHonors((list) => list.filter((x) => !(x.userId === row.userId && x.boardId === row.boardId)));
      toast("已收回称号");
    } catch (e) {
      toast(e.message);
    }
  }

  async function saveMedal(m) {
    try {
      const d = await api(`/api/admin/medals/${m.slug}`, { method: "PUT", body: m });
      setMedalDefs(d.medals || []);
      toast("勋章已更新");
    } catch (e) {
      toast(e.message);
    }
  }

  async function createMedal() {
    if (!newMedal.name.trim()) return toast("请填写勋章名称");
    try {
      const d = await api("/api/admin/medals", { method: "POST", body: newMedal });
      setMedalDefs(d.medals || []);
      setNewMedal({ name: "", icon: "", color: "#ff2442", desc: "" });
      toast("勋章已创建");
    } catch (e) {
      toast(e.message);
    }
  }

  async function delMedal(m) {
    const label = m.builtin ? `停用勋章「${m.name}」？` : `删除勋章「${m.name}」？`;
    if (!window.confirm(label)) return;
    try {
      const d = await api(`/api/admin/medals/${m.slug}`, { method: "DELETE" });
      setMedalDefs(d.medals || []);
      toast(m.builtin ? "已停用" : "已删除");
    } catch (e) {
      toast(e.message);
    }
  }

  async function grantOne() {
    const key = grantKey.trim();
    if (!key) return toast("输入昵称或账号");
    if (!grantSlug) return toast("选择勋章");
    try {
      const d = await api(`/api/admin/users?q=${encodeURIComponent(key)}`);
      const hit = (d.users || [])[0];
      if (!hit) return toast("没有找到这个人");
      await api(`/api/admin/users/${hit.id}/medals`, { method: "POST", body: { slug: grantSlug } });
      toast(`已发给 ${hit.nickname}`);
    } catch (e) {
      toast(e.message);
    }
  }

  function openEdit(u) {
    setEditing({ id: u.id, nickname: u.nickname, bio: u.bio || "", gender: u.gender || "保密", city: u.city || "", birthday: u.birthday || "" });
  }

  async function saveEdit() {
    try {
      const d = await api(`/api/admin/users/${editing.id}`, { method: "PUT", body: editing });
      setUsers((list) => list.map((u) => (u.id === editing.id ? d.user : u)));
      setEditing(null);
      toast("资料已保存");
    } catch (e) {
      toast(e.message);
    }
  }

  async function resetPwd(u) {
    const pwd = window.prompt(`重置 ${u.nickname} 的密码（至少 6 位）：`);
    if (!pwd) return;
    try {
      await api(`/api/admin/users/${u.id}/password`, { method: "POST", body: { password: pwd } });
      toast("密码已重置");
    } catch (e) {
      toast(e.message);
    }
  }

  async function saveLevels() {
    try {
      const d = await api("/api/admin/levels", { method: "PUT", body: { levels } });
      setLevels(d.levels || levels);
      toast("等级表已保存");
    } catch (e) {
      toast(e.message);
    }
  }

  async function saveRules() {
    try {
      const d = await api("/api/admin/exp-rules", { method: "PUT", body: { rules } });
      setRules(d.rules || rules);
      toast("经验规则已保存");
    } catch (e) {
      toast(e.message);
    }
  }

  async function reinstall() {
    if (!window.confirm("会清空帖子、用户、版块和演示数据，只留下新的站长账号。确认继续？")) return;
    try {
      const d = await api("/api/admin/reinstall", { method: "POST", body: fresh });
      if (d.site && setSite) setSite(d.site);
      login(d.token, d.user);
      toast("已重置为全新社区");
      nav("/");
    } catch (e) {
      toast(e.message);
    }
  }

  const fmtUntil = (iso) => (iso && new Date(iso).getTime() > Date.now() ? String(iso).slice(0, 16).replace("T", " ") : "");

  if (!user?.isAdmin) return null;

  return (
    <div className="layout single">
      <div className="admin-page">
        <h2>站务后台</h2>
        <p className="hint">{user.isSuper ? "站长权限：任命管理员与版主、重置密码、重置社区" : "管理员权限：管理用户、版主、勋章称号。升管与重置由站长操作"}</p>
        <div className="tabs">
          <button className={`tab ${tab === "overview" ? "on" : ""}`} onClick={() => setTab("overview")}>总览</button>
          <button className={`tab ${tab === "users" ? "on" : ""}`} onClick={() => setTab("users")}>用户</button>
          <button className={`tab ${tab === "boards" ? "on" : ""}`} onClick={() => setTab("boards")}>板块</button>
          <button className={`tab ${tab === "honors" ? "on" : ""}`} onClick={() => setTab("honors")}>称号</button>
          <button className={`tab ${tab === "medals" ? "on" : ""}`} onClick={() => setTab("medals")}>勋章</button>
          <button className={`tab ${tab === "levels" ? "on" : ""}`} onClick={() => setTab("levels")}>等级</button>
          <button className={`tab ${tab === "hidden" ? "on" : ""}`} onClick={() => setTab("hidden")}>折叠帖</button>
          <button className={`tab ${tab === "logs" ? "on" : ""}`} onClick={() => setTab("logs")}>日志</button>
        </div>
        {tab === "overview" && stats ? (
          <>
            <div className="admin-stats">
              <div><b>{stats.users}</b><span>用户</span></div>
              <div><b>{stats.posts}</b><span>帖子</span></div>
              <div><b>{stats.comments}</b><span>评论</span></div>
              <div><b>{stats.mods}</b><span>版主任命</span></div>
              <div><b>{stats.hidden}</b><span>折叠</span></div>
              <div><b>{stats.banned}</b><span>封禁中</span></div>
            </div>
            <div className="admin-legend">
              {ROLE_LEGEND.map(([k, v]) => (
                <div key={k}><b>{k}</b><span>{v}</span></div>
              ))}
            </div>
            {user.isSuper ? (
              <form className="admin-wipe" onSubmit={(e) => { e.preventDefault(); reinstall(); }}>
                <h3>重置社区（独立于安装向导）</h3>
                <p className="hint">清空帖子、用户、版块和演示数据，并写入新的站长账号。版主要重新任命。</p>
                <label className="field-lab">社区名称<input className="field" value={fresh.siteName} onChange={(e) => setFresh((f) => ({ ...f, siteName: e.target.value }))} maxLength={20} /></label>
                <label className="field-lab">一句话介绍<input className="field" value={fresh.tagline} onChange={(e) => setFresh((f) => ({ ...f, tagline: e.target.value }))} maxLength={40} /></label>
                <label className="field-lab">站长账号<input className="field" value={fresh.username} onChange={(e) => setFresh((f) => ({ ...f, username: e.target.value }))} /></label>
                <label className="field-lab">站长昵称<input className="field" value={fresh.nickname} onChange={(e) => setFresh((f) => ({ ...f, nickname: e.target.value }))} maxLength={16} /></label>
                <label className="field-lab">站长密码<input className="field" type="password" value={fresh.password} onChange={(e) => setFresh((f) => ({ ...f, password: e.target.value }))} placeholder="至少 6 位" /></label>
                <label className="field-lab">确认词<input className="field" value={fresh.confirm} onChange={(e) => setFresh((f) => ({ ...f, confirm: e.target.value }))} placeholder="输入 全新社区" /></label>
                <button className="btn btn-fill" type="submit">清空并重置</button>
              </form>
            ) : null}
          </>
        ) : null}
        {tab === "users" ? (
          <>
            <form className="admin-search" onSubmit={search}>
              <input className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜昵称 / 账号" />
              <select className="field" value={filter} onChange={(e) => { setFilter(e.target.value); setPage(0); }}>
                <option value="all">全部</option>
                <option value="admin">管理员</option>
                <option value="mod">版主</option>
                <option value="banned">封禁中</option>
                <option value="muted">禁言中</option>
              </select>
              <select className="field" value={sort} onChange={(e) => { setSort(e.target.value); setPage(0); }}>
                <option value="new">最新</option>
                <option value="exp">经验</option>
                <option value="gourd">葫芦</option>
              </select>
              <button className="btn btn-fill" type="submit">查询</button>
            </form>
            <div className="admin-duration">
              <label className="hint">封禁时长
                <select className="field" value={banHours} onChange={(e) => setBanHours(Number(e.target.value))}>
                  <option value={24}>1 天</option>
                  <option value={168}>7 天</option>
                  <option value={720}>30 天</option>
                  <option value={8760}>1 年</option>
                </select>
              </label>
              <label className="hint">禁言时长
                <select className="field" value={muteHours} onChange={(e) => setMuteHours(Number(e.target.value))}>
                  <option value={1}>1 小时</option>
                  <option value={24}>1 天</option>
                  <option value={168}>7 天</option>
                </select>
              </label>
              <span className="hint">共 {total} 人</span>
            </div>
            {users.map((u) => {
              const bannedUntil = fmtUntil(u.bannedUntil);
              const mutedUntil = fmtUntil(u.mutedUntil);
              return (
                <div className="admin-row" key={u.id}>
                  <Link to={`/user/${u.id}`}><UserAvatar user={u} size="sm" /></Link>
                  <div className="grow">
                    <b>{u.nickname}</b> <em>@{u.username}</em>
                    <div className="hint">
                      lv{u.level}
                      {u.isSuper ? " · 站长" : u.isAdmin ? " · 管理员" : u.isModerator ? " · 版主" : " · 用户"}
                      {(u.honors || []).length ? ` · ${(u.honors || []).map((h) => `${h.boardName || ""}${h.title}`).join("、")}` : ""}
                    </div>
                    {bannedUntil || mutedUntil ? (
                      <div className="hint warn">
                        {bannedUntil ? `封禁至 ${bannedUntil}` : ""}
                        {bannedUntil && mutedUntil ? " · " : ""}
                        {mutedUntil ? `禁言至 ${mutedUntil}` : ""}
                      </div>
                    ) : null}
                  </div>
                  <div className="admin-acts">
                    {user.isSuper ? (
                      <button type="button" onClick={() => setRole(u.id, u.isAdmin ? "user" : "admin")}>{u.isAdmin ? "取消管理员" : "设为管理员"}</button>
                    ) : null}
                    <button type="button" onClick={() => { setPicked(u); setModQ(u.nickname); setHits([]); setTab("boards"); }}>任命版主</button>
                    <button type="button" onClick={() => { setHonorPicked(u); setHonorQ(u.nickname); setHonorHits([]); setTab("honors"); }}>发称号</button>
                    <button type="button" onClick={() => openEdit(u)}>编辑</button>
                    {user.isSuper ? <button type="button" onClick={() => resetPwd(u)}>重置密码</button> : null}
                    <button type="button" onClick={() => ban(u.id, bannedUntil ? 0 : banHours)}>{bannedUntil ? "解封" : "封禁"}</button>
                    <button type="button" onClick={() => mute(u.id, mutedUntil ? 0 : muteHours)}>{mutedUntil ? "解禁" : "禁言"}</button>
                  </div>
                </div>
              );
            })}
            <div className="admin-pager">
              <button type="button" className="btn" disabled={page <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>上一页</button>
              <span className="hint">第 {page + 1} 页</span>
              <button type="button" className="btn" disabled={(page + 1) * 50 >= total} onClick={() => setPage((p) => p + 1)}>下一页</button>
            </div>
          </>
        ) : null}
        {tab === "boards" ? (
          <>
            <form className="admin-appoint admin-board-form" onSubmit={(e) => { e.preventDefault(); saveBoard(); }}>
              <label className="hint">{editBoardId ? "编辑版块" : "新建版块"}</label>
              <div className="admin-appoint-row">
                <input className="field" value={boardForm.name} onChange={(e) => setBoardForm((f) => ({ ...f, name: e.target.value }))} placeholder="版块名称" maxLength={20} />
                <input className="field" type="color" value={boardForm.color} onChange={(e) => setBoardForm((f) => ({ ...f, color: e.target.value }))} />
              </div>
              <div className="admin-appoint-row">
                <input className="field" value={boardForm.icon} onChange={(e) => setBoardForm((f) => ({ ...f, icon: e.target.value }))} placeholder="图标(1-2字)" maxLength={2} />
                <input className="field" value={boardForm.category} onChange={(e) => setBoardForm((f) => ({ ...f, category: e.target.value }))} placeholder="分类" maxLength={12} />
                {!editBoardId ? <input className="field" value={boardForm.slug} onChange={(e) => setBoardForm((f) => ({ ...f, slug: e.target.value }))} placeholder="标识(可空)" /> : null}
              </div>
              <input className="field" value={boardForm.desc} onChange={(e) => setBoardForm((f) => ({ ...f, desc: e.target.value }))} placeholder="一句话介绍" maxLength={80} />
              <div className="admin-appoint-row">
                <button className="btn btn-fill" type="submit">{editBoardId ? "保存修改" : "创建版块"}</button>
                {editBoardId ? <button className="btn" type="button" onClick={() => { setEditBoardId(null); setBoardForm({ name: "", slug: "", icon: "", color: "#FF6A00", desc: "", category: "生活综合" }); }}>取消</button> : null}
              </div>
            </form>

            <form className="admin-appoint" onSubmit={searchStaff}>
              <label className="hint">搜人点选，再选版块任命版主</label>
              <div className="admin-appoint-row">
                <input className="field" value={modQ} onChange={(e) => { setModQ(e.target.value); setPicked(null); }} placeholder="昵称或账号" />
                <button className="btn btn-fill" type="submit">搜人</button>
              </div>
              {hits.length ? (
                <div className="admin-hits">
                  {hits.map((u) => (
                    <button type="button" className="admin-hit" key={u.id} onClick={() => pickUser(u)}>
                      <UserAvatar user={u} size="sm" />
                      <span><b>{u.nickname}</b><em>@{u.username}</em></span>
                    </button>
                  ))}
                </div>
              ) : null}
              {picked ? <div className="admin-picked">已选 <b>{picked.nickname}</b> @{picked.username}</div> : null}
              <div className="admin-appoint-row">
                <select className="field" value={boardId} onChange={(e) => setBoardId(e.target.value)}>
                  <option value="">选择版块</option>
                  {boards.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <button className="btn btn-fill" type="button" onClick={addMod}>任命版主</button>
            </form>

            {boards.map((b) => (
              <div className="admin-board" key={b.id}>
                <div className="admin-board-h">
                  <b><i className="medal-dot" style={{ background: b.color }}>{b.icon || b.name.slice(0, 1)}</i>{b.name}</b>
                  <span className="admin-acts">
                    <button type="button" onClick={() => openEditBoard(b)}>编辑</button>
                    <button type="button" onClick={() => delBoard(b)}>删除</button>
                  </span>
                </div>
                <div className="admin-mods">
                  {(b.staff || []).map((m) => (
                    <span className="admin-mod-chip" key={m.id}>
                      {m.nickname}
                      <button type="button" onClick={() => dropMod(b.id, m.id)}>撤</button>
                    </span>
                  ))}
                  {!(b.staff || []).length ? <em className="hint">暂无版主</em> : null}
                </div>
              </div>
            ))}
          </>
        ) : null}
        {tab === "honors" ? (
          <>
            <form className="admin-appoint" onSubmit={searchHonor}>
              <label className="hint">按用户+版块发展示称号，不必先当版主</label>
              <div className="admin-appoint-row">
                <input className="field" value={honorQ} onChange={(e) => { setHonorQ(e.target.value); setHonorPicked(null); }} placeholder="昵称或账号" />
                <button className="btn btn-fill" type="submit">搜人</button>
              </div>
              {honorHits.length ? (
                <div className="admin-hits">
                  {honorHits.map((u) => (
                    <button type="button" className="admin-hit" key={u.id} onClick={() => { setHonorPicked(u); setHonorHits([]); setHonorQ(u.nickname); }}>
                      <UserAvatar user={u} size="sm" />
                      <span><b>{u.nickname}</b><em>@{u.username}</em></span>
                    </button>
                  ))}
                </div>
              ) : null}
              {honorPicked ? <div className="admin-picked">已选 <b>{honorPicked.nickname}</b> @{honorPicked.username}</div> : null}
              <div className="admin-appoint-row">
                <select className="field" value={honorBoard} onChange={(e) => {
                  const id = e.target.value;
                  setHonorBoard(id);
                  const b = boards.find((x) => String(x.id) === String(id));
                  if (b) {
                    setHonorTitle(b.defaultHonor || honorTitle);
                    setHonorColor(b.defaultHonorColor || honorColor);
                  }
                }}>
                  <option value="">选择版块</option>
                  {boards.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <input className="field" value={honorTitle} onChange={(e) => setHonorTitle(e.target.value)} placeholder="称号" maxLength={8} />
                <input className="field" type="color" value={honorColor} onChange={(e) => setHonorColor(e.target.value)} />
              </div>
              <button className="btn btn-fill" type="button" onClick={saveHonor}>保存称号</button>
            </form>
            {honors.map((h) => (
              <div className="admin-row" key={`${h.boardId}-${h.userId}`}>
                <UserAvatar user={{ avatar: h.avatar, nickname: h.nickname }} size="sm" />
                <div className="grow">
                  <b>{h.nickname}</b> <em>@{h.username}</em>
                  <div className="hint">{h.boardName} · <span className="honor-chip" style={{ background: h.color }}>{h.title}</span></div>
                </div>
                <button type="button" onClick={() => dropHonor(h)}>收回</button>
              </div>
            ))}
            {honors.length === 0 ? <div className="empty">还没有发放称号</div> : null}
          </>
        ) : null}
        {tab === "medals" ? (
          <>
            <form className="admin-appoint admin-board-form" onSubmit={(e) => { e.preventDefault(); createMedal(); }}>
              <label className="hint">新建勋章</label>
              <div className="admin-appoint-row">
                <input className="field" value={newMedal.name} onChange={(e) => setNewMedal((f) => ({ ...f, name: e.target.value }))} placeholder="勋章名称" maxLength={12} />
                <input className="field" value={newMedal.icon} onChange={(e) => setNewMedal((f) => ({ ...f, icon: e.target.value }))} placeholder="图标(1-2字)" maxLength={2} />
                <input className="field" type="color" value={newMedal.color} onChange={(e) => setNewMedal((f) => ({ ...f, color: e.target.value }))} />
              </div>
              <input className="field" value={newMedal.desc} onChange={(e) => setNewMedal((f) => ({ ...f, desc: e.target.value }))} placeholder="描述" maxLength={40} />
              <button className="btn btn-fill" type="submit">创建勋章</button>
            </form>
            <form className="admin-appoint" onSubmit={(e) => { e.preventDefault(); grantOne(); }}>
              <label className="hint">按昵称发放勋章</label>
              <div className="admin-appoint-row">
                <input className="field" value={grantKey} onChange={(e) => setGrantKey(e.target.value)} placeholder="昵称或账号" />
                <select className="field" value={grantSlug} onChange={(e) => setGrantSlug(e.target.value)}>
                  <option value="">选择勋章</option>
                  {medalDefs.map((m) => <option key={m.slug} value={m.slug}>{m.name}</option>)}
                </select>
                <button className="btn btn-fill" type="submit">发放</button>
              </div>
            </form>
            {medalDefs.map((m) => (
              <div className="admin-row admin-medal" key={m.slug}>
                <i className="medal-dot lg" style={{ background: m.color }}>{m.icon}</i>
                <div className="grow admin-medal-fields">
                  <input className="field" value={m.name} onChange={(e) => setMedalDefs((list) => list.map((x) => x.slug === m.slug ? { ...x, name: e.target.value } : x))} />
                  <input className="field" value={m.desc} onChange={(e) => setMedalDefs((list) => list.map((x) => x.slug === m.slug ? { ...x, desc: e.target.value } : x))} />
                </div>
                <label className="hint"><input type="checkbox" checked={m.enabled !== false} onChange={(e) => setMedalDefs((list) => list.map((x) => x.slug === m.slug ? { ...x, enabled: e.target.checked } : x))} />启用</label>
                <button type="button" onClick={() => saveMedal(m)}>保存</button>
                <button type="button" onClick={() => delMedal(m)}>{m.builtin ? "停用" : "删除"}</button>
              </div>
            ))}
          </>
        ) : null}
        {tab === "levels" ? (
          <>
            <h3 className="music-sec">经验获得方式</h3>
            {rules.map((r, i) => (
              <div className="admin-row" key={r.id}>
                <div className="grow">{r.group} · {r.name}</div>
                <input className="field admin-num" type="number" value={r.exp} onChange={(e) => setRules((list) => list.map((x, j) => j === i ? { ...x, exp: Number(e.target.value) } : x))} />
                <input className="field" value={r.note || ""} onChange={(e) => setRules((list) => list.map((x, j) => j === i ? { ...x, note: e.target.value } : x))} placeholder="备注" />
              </div>
            ))}
            <button className="btn btn-fill" type="button" onClick={saveRules}>保存经验规则</button>
            <h3 className="music-sec">经验等级明细</h3>
            {levels.map((r, i) => (
              <div className="admin-row" key={r.level}>
                <b>LV {r.level}</b>
                <input className="field admin-num" type="number" value={r.exp} onChange={(e) => setLevels((list) => list.map((x, j) => j === i ? { ...x, exp: Number(e.target.value) } : x))} />
                <input className="field" value={r.title} onChange={(e) => setLevels((list) => list.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} />
                <input className="field" type="color" value={r.color} onChange={(e) => setLevels((list) => list.map((x, j) => j === i ? { ...x, color: e.target.value } : x))} />
              </div>
            ))}
            <button className="btn btn-fill" type="button" onClick={saveLevels}>保存等级表</button>
          </>
        ) : null}
        {tab === "hidden" ? (
          hidden.length ? hidden.map((p) => (
            <div className="admin-row" key={p.id}>
              <div className="grow">
                <Link to={`/post/${p.id}`}><b>{p.title}</b></Link>
                <div className="hint">{p.author?.nickname} · {p.board?.name}</div>
              </div>
              <button type="button" onClick={() => unhide(p.id)}>取消折叠</button>
            </div>
          )) : <div className="empty">没有折叠帖</div>
        ) : null}
        {tab === "logs" ? (
          logs.length ? logs.map((l) => {
            const actName = {
              ban: "封禁", unban: "解封", mute: "禁言", unmute: "解除禁言",
              role_admin: "设为管理员", role_user: "取消管理员",
              user_edit: "编辑用户", user_password: "重置密码",
              board_create: "创建版块", board_edit: "编辑版块", board_delete: "删除版块", board_rules: "更新版规",
              medal_create: "创建勋章", medal_delete: "删除勋章"
            }[l.action] || l.action;
            return (
              <div className="admin-row" key={l.id}>
                <div className="grow">
                  <b>{actName}</b>
                  <div className="hint">{l.detail || (l.target ? `对象 ${l.target}` : "")}</div>
                </div>
                <em className="hint">{l.admin || ""} · {String(l.createdAt || "").slice(0, 16).replace("T", " ")}</em>
              </div>
            );
          }) : <div className="empty">还没有操作记录</div>
        ) : null}
      </div>
      {editing ? (
        <div className="modal-mask" onClick={() => setEditing(null)}>
          <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); saveEdit(); }}>
            <h3>编辑用户资料</h3>
            <label className="field-lab">昵称<input className="field" value={editing.nickname} onChange={(e) => setEditing((f) => ({ ...f, nickname: e.target.value }))} maxLength={16} /></label>
            <label className="field-lab">简介<input className="field" value={editing.bio} onChange={(e) => setEditing((f) => ({ ...f, bio: e.target.value }))} maxLength={120} /></label>
            <label className="field-lab">性别
              <select className="field" value={editing.gender} onChange={(e) => setEditing((f) => ({ ...f, gender: e.target.value }))}>
                <option value="保密">保密</option>
                <option value="男">男</option>
                <option value="女">女</option>
              </select>
            </label>
            <label className="field-lab">城市<input className="field" value={editing.city} onChange={(e) => setEditing((f) => ({ ...f, city: e.target.value }))} maxLength={12} /></label>
            <label className="field-lab">生日<input className="field" type="date" value={editing.birthday} onChange={(e) => setEditing((f) => ({ ...f, birthday: e.target.value }))} /></label>
            <div className="admin-appoint-row">
              <button className="btn btn-fill" type="submit">保存</button>
              <button className="btn" type="button" onClick={() => setEditing(null)}>取消</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
