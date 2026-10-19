import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context.jsx";
import { DressPreview, UserAvatar } from "../components/Dress.jsx";

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
  const [trash, setTrash] = useState([]);
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
  const [honorDays, setHonorDays] = useState(0);
  const [grantKey, setGrantKey] = useState("");
  const [grantSlug, setGrantSlug] = useState("");
  const [boardForm, setBoardForm] = useState({ name: "", slug: "", icon: "", color: "#FF6A00", desc: "", category: "生活综合", types: "讨论,求助,分享", announcement: "" });
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
  const [parseCost, setParseCost] = useState(1);
  const [parseApis, setParseApis] = useState([]);
  const [parseStats, setParseStats] = useState([]);
  const [parseLogs, setParseLogs] = useState([]);
  const [parseQ, setParseQ] = useState("");
  const [apiForm, setApiForm] = useState({
    name: "",
    slug: "",
    apiUrl: "",
    parseType: "",
    respData: "",
    respTitle: "",
    respVideo: "",
    respImg: "",
    sort: 0
  });
  const [gifts, setGifts] = useState([]);
  const [giftForm, setGiftForm] = useState({
    name: "", slug: "", kind: "frame", cost: 80, stock: 999, desc: "", mark: "框", color: "#f59e0b", color2: "#fde68a", style: "shiba", bg: "#f6f7f9", card: "#ffffff", ink: "#1f2937"
  });
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiDrafts, setAiDrafts] = useState([]);
  const [featBanners, setFeatBanners] = useState([]);
  const [featCommunity, setFeatCommunity] = useState([]);
  const [featQ, setFeatQ] = useState("");
  const [featHits, setFeatHits] = useState([]);
  const [shopPlans, setShopPlans] = useState([]);
  const [shopPretty, setShopPretty] = useState([]);
  const [shopUin, setShopUin] = useState("");
  const [shopCost, setShopCost] = useState(88);
  const [shopQ, setShopQ] = useState("");
  const [yyApi, setYyApi] = useState("");
  const [yyCookie, setYyCookie] = useState("");
  const [miniApps, setMiniApps] = useState([]);
  const [appForm, setAppForm] = useState({ name: "", path: "", color: "#ff2442", mark: "" });
  const [reports, setReports] = useState([]);
  const [words, setWords] = useState("");

  async function load() {
    const o = await api("/api/admin/overview");
    setStats(o);
    const p = await api("/api/admin/posts?hidden=1");
    setHidden(p.posts || []);
    const t = await api("/api/admin/posts?trash=1");
    setTrash(t.posts || []);
    api("/api/admin/reports").then((d) => setReports(d.reports || [])).catch(() => setReports([]));
    if (!user?.isAdmin) return;
    setYyApi(o.yyApi || "");
    setYyCookie(o.yyCookie || "");
    const b = await api("/api/admin/boards");
    setBoards(b.boards || []);
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
    api("/api/admin/words").then((d) => setWords(typeof d.words === "string" ? d.words : "")).catch(() => setWords(""));
  }

  async function fetchUsers(pg = page) {
    const p = new URLSearchParams({ filter, sort, page: String(pg) });
    if (q.trim()) p.set("q", q.trim());
    const d = await api(`/api/admin/users?${p.toString()}`);
    setUsers(d.users || []);
    setTotal(d.total || 0);
  }

  async function loadParse() {
    const d = await api("/api/admin/parse");
    setParseCost(d.cost ?? 1);
    setParseApis(d.apis || []);
    setParseStats(d.stats || []);
    const l = await api("/api/admin/parse/logs");
    setParseLogs(l.logs || []);
  }

  useEffect(() => {
    if (!user) return nav("/login");
    if (!user.isAdmin && !user.isModerator) {
      toast("需要版主或管理员权限");
      return nav("/me");
    }
    load().catch((e) => toast(e.message));
  }, [user]);

  useEffect(() => {
    if (user?.isAdmin) fetchUsers().catch((e) => toast(e.message));
  }, [filter, sort, page, user]);

  useEffect(() => {
    if (tab === "parse" && user?.isAdmin) loadParse().catch((e) => toast(e.message));
  }, [tab, user]);

  useEffect(() => {
    if (tab === "dress" && user?.isAdmin) loadGifts().catch((e) => toast(e.message));
  }, [tab, user]);

  useEffect(() => {
    if (tab === "featured" && user?.isAdmin) loadFeatured().catch((e) => toast(e.message));
  }, [tab, user]);

  useEffect(() => {
    if (tab === "shop" && user?.isAdmin) loadShop().catch((e) => toast(e.message));
  }, [tab, user]);

  useEffect(() => {
    if (tab === "apps" && user?.isAdmin) {
      api("/api/mini-apps").then((d) => setMiniApps(d.apps || [])).catch((e) => toast(e.message));
    }
  }, [tab, user]);

  async function loadGifts() {
    const d = await api("/api/admin/gifts");
    setGifts(d.gifts || []);
  }

  async function loadFeatured() {
    const d = await api("/api/admin/featured");
    setFeatBanners(d.banners || []);
    setFeatCommunity(d.community || []);
  }

  async function searchFeat(e) {
    if (e) e.preventDefault();
    const q = featQ.trim();
    if (!q) {
      setFeatHits([]);
      return;
    }
    const d = await api(`/api/admin/posts?q=${encodeURIComponent(q)}`);
    setFeatHits(d.posts || []);
  }

  function addFeat(list, setList, post, max) {
    if (!post) return;
    if (list.some((p) => p.id === post.id)) return toast("已经加过了");
    if (list.length >= max) return toast(`最多 ${max} 条`);
    setList([...list, post]);
  }

  function moveFeat(list, setList, i, dir) {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const next = list.slice();
    const a = next[i];
    next[i] = next[j];
    next[j] = a;
    setList(next);
  }

  async function saveFeatured() {
    try {
      const d = await api("/api/admin/featured", {
        method: "PUT",
        body: {
          bannerIds: featBanners.map((p) => p.id),
          communityIds: featCommunity.map((p) => p.id)
        }
      });
      setFeatBanners(d.banners || []);
      setFeatCommunity(d.community || []);
      toast("推荐位已保存，留空则自动挑选");
    } catch (err) {
      toast(err.message);
    }
  }

  async function loadShop(q) {
    const key = q == null ? shopQ : q;
    const qs = String(key || "").trim();
    const d = await api(`/api/admin/shop${qs ? `?q=${encodeURIComponent(qs)}` : ""}`);
    setShopPlans(d.plans || []);
    setShopPretty(d.pretty || []);
  }

  async function removePretty(item) {
    if (!window.confirm(`从号店删除 ${item.uin}？已卖出的号码不受影响`)) return;
    try {
      const qs = shopQ.trim() ? `?q=${encodeURIComponent(shopQ.trim())}` : "";
      const d = await api(`/api/admin/shop/pretty/${item.uin}${qs}`, { method: "DELETE" });
      setShopPretty(d.pretty || []);
      toast(`已删除 ${item.uin}`);
    } catch (err) {
      toast(err.message);
    }
  }

  async function saveShopPlans() {
    try {
      const d = await api("/api/admin/shop/plans", { method: "PUT", body: { plans: shopPlans } });
      setShopPlans(d.plans || []);
      toast("会员套餐已保存");
    } catch (e) {
      toast(e.message);
    }
  }

  async function addShopPretty(e) {
    if (e) e.preventDefault();
    try {
      const d = await api("/api/admin/shop/pretty", { method: "POST", body: { uin: Number(shopUin), cost: Number(shopCost), enabled: true } });
      setShopPretty(d.pretty || []);
      setShopUin("");
      toast(`已上架 ${d.item.uin}`);
    } catch (err) {
      toast(err.message);
    }
  }

  async function patchPretty(item, patch) {
    try {
      const d = await api(`/api/admin/shop/pretty/${item.uin}`, { method: "PUT", body: patch });
      setShopPretty(d.pretty || []);
    } catch (err) {
      toast(err.message);
    }
  }

  async function addGift(e) {
    e.preventDefault();
    try {
      await api("/api/admin/gifts", { method: "POST", body: giftForm });
      setGiftForm({ name: "", slug: "", kind: "frame", cost: 80, stock: 999, desc: "", mark: "框", color: "#f59e0b", color2: "#fde68a", style: "shiba", bg: "#f6f7f9", card: "#ffffff", ink: "#1f2937" });
      setAiDrafts([]);
      toast("装扮已添加，集市可兑换");
      await loadGifts();
    } catch (err) {
      toast(err.message);
    }
  }

  function applyDraft(d) {
    if (!d) return;
    setGiftForm((f) => ({
      ...f,
      kind: d.kind || f.kind,
      name: d.name || f.name,
      slug: d.slug || f.slug,
      mark: d.mark || f.mark,
      color: d.color || f.color,
      color2: d.color2 || f.color2,
      desc: d.desc || f.desc,
      style: d.style || f.style,
      bg: d.bg || f.bg,
      card: d.card || f.card,
      ink: d.ink || f.ink
    }));
  }

  async function designGift() {
    setAiBusy(true);
    try {
      const d = await api("/api/admin/gifts/ai", { method: "POST", body: { prompt: aiPrompt, kind: giftForm.kind } });
      const drafts = d.drafts || (d.draft ? [d.draft] : []);
      setAiDrafts(drafts);
      if (drafts[0]) applyDraft(drafts[0]);
      toast(drafts.length ? `已出 ${drafts.length} 套方案，点选后可再改` : "没有方案");
    } catch (err) {
      toast(err.message);
    } finally {
      setAiBusy(false);
    }
  }

  async function saveGift(row) {
    try {
      await api(`/api/admin/gifts/${row.id}`, {
        method: "PUT",
        body: {
          name: row.name,
          cost: row.cost,
          stock: row.stock,
          desc: row.desc,
          mark: (row.payload && row.payload.mark) || "",
          color: (row.payload && row.payload.color) || "#ff2442",
          color2: (row.payload && row.payload.color2) || "#fbbf24",
          style: (row.payload && row.payload.style) || "",
          bg: (row.payload && row.payload.bg) || "#f6f7f9",
          card: (row.payload && row.payload.card) || "#ffffff",
          ink: (row.payload && row.payload.ink) || "#1f2937"
        }
      });
      toast("已保存");
      await loadGifts();
    } catch (err) {
      toast(err.message);
    }
  }

  async function removeGift(row) {
    if (!window.confirm(`删除装扮「${row.name}」？已兑换的会一并收回。`)) return;
    try {
      await api(`/api/admin/gifts/${row.id}/remove`, { method: "POST" });
      toast("已删除");
      await loadGifts();
    } catch (err) {
      toast(err.message);
    }
  }

  function patchGift(id, patch) {
    setGifts((list) => list.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }

  function patchGiftPayload(id, patch) {
    setGifts((list) => list.map((g) => (g.id === id ? { ...g, payload: { ...(g.payload || {}), ...patch } } : g)));
  }

  async function saveParseCost() {
    try {
      const d = await api("/api/admin/parse/cost", { method: "PUT", body: { cost: Number(parseCost) } });
      setParseCost(d.cost);
      toast("扣费已保存");
    } catch (e) {
      toast(e.message);
    }
  }

  async function addParseApi(e) {
    e.preventDefault();
    try {
      await api("/api/admin/parse/apis", { method: "POST", body: apiForm });
      setApiForm({ name: "", slug: "", apiUrl: "", parseType: "", respData: "", respTitle: "", respVideo: "", respImg: "", sort: 0 });
      toast("接口已添加");
      await loadParse();
    } catch (err) {
      toast(err.message);
    }
  }

  async function toggleParseApi(row) {
    try {
      await api(`/api/admin/parse/apis/${row.id}`, { method: "PUT", body: { ...row, enabled: !row.enabled } });
      await loadParse();
    } catch (err) {
      toast(err.message);
    }
  }

  async function removeParseApi(row) {
    if (!window.confirm(`移除接口「${row.name}」？`)) return;
    try {
      await api(`/api/admin/parse/apis/${row.id}/remove`, { method: "POST" });
      toast("已移除");
      await loadParse();
    } catch (err) {
      toast(err.message);
    }
  }

  async function searchParseLogs(e) {
    e.preventDefault();
    try {
      const p = new URLSearchParams();
      if (parseQ.trim()) p.set("q", parseQ.trim());
      const d = await api(`/api/admin/parse/logs?${p.toString()}`);
      setParseLogs(d.logs || []);
    } catch (err) {
      toast(err.message);
    }
  }

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

  async function grantVip(id, tier) {
    try {
      const d = await api(`/api/admin/users/${id}/vip`, { method: "POST", body: { days: 30, tier: tier || "vip" } });
      setUsers((list) => list.map((u) => (u.id === id ? d.user : u)));
      toast(`已赠送 30 天 ${tier === "svip" ? "SVIP" : "VIP"}`);
    } catch (e) {
      toast(e.message);
    }
  }

  async function setUin(id, current) {
    const next = window.prompt("设置青葫号（10001-99999999999，10001 为超管）", current || "");
    if (next == null || !String(next).trim()) return;
    try {
      const d = await api(`/api/admin/users/${id}/uin`, { method: "POST", body: { uin: Number(next) } });
      setUsers((list) => list.map((u) => (u.id === id ? d.user : u)));
      toast(`青葫号已设为 ${d.user.uin}`);
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
      setBoardForm({ name: "", slug: "", icon: "", color: "#FF6A00", desc: "", category: "生活综合", types: "讨论,求助,分享", announcement: "" });
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
      category: b.category || "生活综合",
      types: (b.threadTypes || []).map((t) => t.name).join(","),
      announcement: b.announcement || ""
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

  async function restorePost(id) {
    try {
      await api(`/api/posts/${id}/moderate`, { method: "POST", body: { action: "restore" } });
      setTrash((list) => list.filter((p) => p.id !== id));
      toast("已还原");
      load().catch(() => {});
    } catch (e) {
      toast(e.message);
    }
  }

  async function purgePost(id) {
    if (!window.confirm("确认彻底删除？此操作不可恢复。")) return;
    try {
      await api(`/api/posts/${id}/moderate`, { method: "POST", body: { action: "purge" } });
      setTrash((list) => list.filter((p) => p.id !== id));
      toast("已彻底删除");
      load().catch(() => {});
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
        body: { userId: honorPicked.id, boardId: honorBoard, honor: honorTitle, honorColor: honorColor, days: Number(honorDays) || 0 }
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
    setEditing({ id: u.id, nickname: u.nickname, bio: u.bio || "", gender: u.gender || "保密", city: u.city || "", birthday: u.birthday || "", verifyKind: u.verifyKind || "", verifyTitle: u.verifyTitle || "" });
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

  if (!user?.isAdmin && !user?.isModerator) return null;

  return (
    <div className="layout single admin-shell">
      <div className="admin-page">
        <h2>站务后台</h2>
        <p className="hint">{user.isSuper
          ? "站长权限：任命管理员与版主、重置密码、重置社区"
          : user.isAdmin
            ? "管理员权限：管理用户、版主、勋章称号。升管与重置由站长操作"
            : "版主权限：只处理你所辖版块的折叠帖、回收站与举报"}</p>
        <div className="tabs">
          <button className={`tab ${tab === "overview" ? "on" : ""}`} onClick={() => setTab("overview")}>总览</button>
          {user.isAdmin ? (
            <>
              <button className={`tab ${tab === "users" ? "on" : ""}`} onClick={() => setTab("users")}>用户</button>
              <button className={`tab ${tab === "boards" ? "on" : ""}`} onClick={() => setTab("boards")}>板块</button>
              <button className={`tab ${tab === "honors" ? "on" : ""}`} onClick={() => setTab("honors")}>称号</button>
              <button className={`tab ${tab === "medals" ? "on" : ""}`} onClick={() => setTab("medals")}>勋章</button>
              <button className={`tab ${tab === "dress" ? "on" : ""}`} onClick={() => setTab("dress")}>装扮</button>
              <button className={`tab ${tab === "featured" ? "on" : ""}`} onClick={() => setTab("featured")}>推荐</button>
              <button className={`tab ${tab === "shop" ? "on" : ""}`} onClick={() => setTab("shop")}>号店</button>
              <button className={`tab ${tab === "levels" ? "on" : ""}`} onClick={() => setTab("levels")}>等级</button>
            </>
          ) : null}
          <button className={`tab ${tab === "hidden" ? "on" : ""}`} onClick={() => setTab("hidden")}>折叠帖</button>
          <button className={`tab ${tab === "trash" ? "on" : ""}`} onClick={() => setTab("trash")}>回收站</button>
          {user.isAdmin ? (
            <>
              <button className={`tab ${tab === "parse" ? "on" : ""}`} onClick={() => setTab("parse")}>去水印</button>
              <button className={`tab ${tab === "apps" ? "on" : ""}`} onClick={() => setTab("apps")}>小应用</button>
            </>
          ) : null}
          <button className={`tab ${tab === "reports" ? "on" : ""}`} onClick={() => setTab("reports")}>举报</button>
          {user.isAdmin ? (
            <>
              <button className={`tab ${tab === "words" ? "on" : ""}`} onClick={() => setTab("words")}>敏感词</button>
              <button className={`tab ${tab === "logs" ? "on" : ""}`} onClick={() => setTab("logs")}>日志</button>
            </>
          ) : null}
        </div>
        {tab === "overview" && stats ? (
          <>
            {stats.scope === "mod" ? (
              <>
                <div className="admin-stats">
                  <div><b>{(stats.boards || []).length}</b><span>所辖版块</span></div>
                  <div><b>{stats.posts}</b><span>帖子</span></div>
                  <div><b>{stats.comments}</b><span>评论</span></div>
                  <div><b>{stats.hidden}</b><span>折叠</span></div>
                  <div><b>{stats.trash || 0}</b><span>回收站</span></div>
                </div>
                <div className="admin-legend">
                  {(stats.boards || []).length
                    ? stats.boards.map((b) => <div key={b.id}><b>{b.name}</b><span>版主</span></div>)
                    : <div><b>暂无</b><span>还没有任命版块</span></div>}
                </div>
              </>
            ) : (
              <>
                <div className="admin-stats">
                  <div><b>{stats.users}</b><span>用户</span></div>
                  <div><b>{stats.posts}</b><span>帖子</span></div>
                  <div><b>{stats.comments}</b><span>评论</span></div>
                  <div><b>{stats.mods}</b><span>版主任命</span></div>
                  <div><b>{stats.hidden}</b><span>折叠</span></div>
                  <div><b>{stats.trash || 0}</b><span>回收站</span></div>
                  <div><b>{stats.banned}</b><span>封禁中</span></div>
                </div>
                <div className="admin-legend">
                  {ROLE_LEGEND.map(([k, v]) => (
                    <div key={k}><b>{k}</b><span>{v}</span></div>
                  ))}
                </div>
              </>
            )}
            {user.isAdmin ? (
              <>
            <form className="admin-wipe" onSubmit={async (e) => {
              e.preventDefault();
              try {
                const d = await api("/api/admin/yy-api", { method: "PUT", body: { url: yyApi, cookie: yyCookie } });
                setYyApi(d.yyApi || "");
                setYyCookie(d.yyCookie || "");
                toast(d.yyApi ? "电台接口已保存" : "已清空电台接口，搜歌走预览源");
              } catch (err) {
                toast(err.message);
              }
            }}>
              <h3>三楼电台</h3>
              <p className="hint">推荐在网站根目录执行 bash 安装电台接口.sh，脚本会写入本机地址（如 http://127.0.0.1:3000）。文档站 neteasecloudmusicapienhanced.js.org 只用来查接口说明。留空则搜歌只用预览源。</p>
              <input className="field" value={yyApi} onChange={(e) => setYyApi(e.target.value)} placeholder="http://127.0.0.1:3000" />
              <p className="hint">想要整首而不是 30 秒试听，填网易云登录 Cookie（MUSIC_U=...）。在浏览器登录 music.163.com 后，从开发者工具里复制请求头的 Cookie 整段，或只填 MUSIC_U 的值。会员/独家版权曲仍可能拿不到，属正常。</p>
              <input className="field" value={yyCookie} onChange={(e) => setYyCookie(e.target.value)} placeholder="MUSIC_U=xxxx （可留空）" />
              <button className="btn btn-fill" type="submit">保存电台接口</button>
            </form>
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
          </>
        ) : null}
        {tab === "users" ? (
          <>
            <form className="admin-search" onSubmit={search}>
              <input className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜昵称 / 账号 / 青葫号" />
              <select className="field" value={filter} onChange={(e) => { setFilter(e.target.value); setPage(0); }}>
                <option value="all">全部</option>
                <option value="admin">管理员</option>
                <option value="mod">版主</option>
                <option value="banned">封禁中</option>
                <option value="muted">禁言中</option>
                <option value="vip">会员</option>
                <option value="svip">SVIP</option>
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
                      {u.uin ? ` · 号 ${u.uin}` : ""}
                      {u.vip ? ` · ${u.vipLabel || "VIP"}` : ""}
                      {u.isSuper ? " · 站长" : u.isAdmin ? " · 管理员" : u.isModerator ? " · 版主" : " · 用户"}
                      {u.verifyKind ? ` · ${u.verifyKind === "official" ? "官方认证" : u.verifyKind === "org" ? "企业认证" : "个人认证"}` : ""}
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
                    <button type="button" onClick={() => grantVip(u.id, "vip")}>赠VIP</button>
                    <button type="button" onClick={() => grantVip(u.id, "svip")}>赠SVIP</button>
                    <button type="button" onClick={() => setUin(u.id, u.uin)}>改号</button>
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
              <input className="field" value={boardForm.types || ""} onChange={(e) => setBoardForm((f) => ({ ...f, types: e.target.value }))} placeholder="主题分类，逗号分隔，如 讨论,求助,分享" maxLength={120} />
              <input className="field" value={boardForm.announcement || ""} onChange={(e) => setBoardForm((f) => ({ ...f, announcement: e.target.value }))} placeholder="版块公告（可空）" maxLength={500} />
              <div className="admin-appoint-row">
                <button className="btn btn-fill" type="submit">{editBoardId ? "保存修改" : "创建版块"}</button>
                {editBoardId ? <button className="btn" type="button" onClick={() => { setEditBoardId(null); setBoardForm({ name: "", slug: "", icon: "", color: "#FF6A00", desc: "", category: "生活综合", types: "讨论,求助,分享", announcement: "" }); }}>取消</button> : null}
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
              <label className="hint">有效天数，0 为长期
                <input className="field admin-num" type="number" min="0" value={honorDays} onChange={(e) => setHonorDays(e.target.value)} />
              </label>
              <button className="btn btn-fill" type="button" onClick={saveHonor}>保存称号</button>
            </form>
            {honors.map((h) => (
              <div className="admin-row" key={`${h.boardId}-${h.userId}`}>
                <UserAvatar user={{ avatar: h.avatar, nickname: h.nickname }} size="sm" />
                <div className="grow">
                  <b>{h.nickname}</b> <em>@{h.username}</em>
                  <div className="hint">{h.boardName} · <span className="honor-chip" style={{ background: h.color }}>{h.title}</span> · {h.expiresAt ? (Date.parse(h.expiresAt) > Date.now() ? `至 ${String(h.expiresAt).slice(0, 10)}` : "已过期") : "长期"}{h.shown ? " · 展示中" : ""}</div>
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
        {tab === "dress" ? (
          <>
            <p className="hint">先选种类再写描述，DeepSeek 会出 3 套可视化方案（头像框 / 聊天框 / 主页装扮），点选后可再微调创建。</p>
            <form className="admin-appoint admin-board-form" onSubmit={addGift}>
              <div className="admin-dress-preview">
                <DressPreview gift={{ kind: giftForm.kind, name: giftForm.name || "新装扮", slug: giftForm.slug || "new", payload: giftForm }} />
              </div>
              <div className="admin-appoint-row">
                <select className="field" value={giftForm.kind} onChange={(e) => {
                  const kind = e.target.value;
                  const style = kind === "bubble" ? "shiba" : kind === "card" ? "wash" : "shiba";
                  setGiftForm((f) => ({ ...f, kind, style }));
                }}>
                  <option value="frame">头像框</option>
                  <option value="bubble">聊天框</option>
                  <option value="card">主页装扮</option>
                </select>
                <input className="field" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="例如：金柴头像框 / 云朵聊天框 / 红楼主页" maxLength={80} />
                <button className="btn" type="button" disabled={aiBusy} onClick={designGift}>{aiBusy ? "设计中" : "AI 设计"}</button>
              </div>
              {aiDrafts.length ? (
                <div className="ai-drafts">
                  {aiDrafts.map((d, i) => (
                    <button type="button" key={d.slug || i} className={`ai-draft${giftForm.name === d.name && giftForm.style === d.style ? " on" : ""}`} onClick={() => applyDraft(d)}>
                      <DressPreview gift={{ kind: d.kind, name: d.name, slug: d.slug, payload: d }} />
                      <b>{d.name}</b>
                      <span>{d.desc}</span>
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="admin-appoint-row">
                <input className="field" value={giftForm.name} onChange={(e) => setGiftForm((f) => ({ ...f, name: e.target.value }))} placeholder="名称" maxLength={20} />
                <input className="field" value={giftForm.slug} onChange={(e) => setGiftForm((f) => ({ ...f, slug: e.target.value }))} placeholder="slug 可空" maxLength={20} />
                <input className="field admin-num" type="number" min="0" value={giftForm.cost} onChange={(e) => setGiftForm((f) => ({ ...f, cost: e.target.value }))} placeholder="葫芦" />
              </div>
              <div className="admin-appoint-row">
                <select className="field" value={giftForm.style} onChange={(e) => setGiftForm((f) => ({ ...f, style: e.target.value }))}>
                  {(giftForm.kind === "bubble"
                    ? [["shiba", "柴犬"], ["bird", "青鸟"], ["hamster", "仓鼠"], ["duck", "鸭子"], ["puppy", "小狗"], ["corgi", "柯基"], ["cloud", "云朵"], ["cat", "橘猫"], ["black", "小黑"], ["lantern", "灯笼"]]
                    : giftForm.kind === "card"
                    ? [["wash", "水彩"], ["seal", "红章"], ["neon", "霓虹"], ["paper", "信纸"]]
                    : [["shiba", "柴犬"], ["bird", "青鸟"], ["hamster", "仓鼠"], ["duck", "鸭子"], ["puppy", "小狗"], ["wave", "海浪"], ["ice", "冰晶"], ["bunny", "萌兔"], ["blaze", "焰环"], ["hat", "牛仔帽"]]
                  ).map(([v, n]) => <option key={v} value={v}>{n}</option>)}
                </select>
                <input className="field" value={giftForm.mark} onChange={(e) => setGiftForm((f) => ({ ...f, mark: e.target.value }))} placeholder="角标 1-2 字" maxLength={2} />
                <input className="field" type="color" value={giftForm.color} onChange={(e) => setGiftForm((f) => ({ ...f, color: e.target.value }))} />
                <input className="field" type="color" value={giftForm.color2} onChange={(e) => setGiftForm((f) => ({ ...f, color2: e.target.value }))} />
                <input className="field admin-num" type="number" min="0" value={giftForm.stock} onChange={(e) => setGiftForm((f) => ({ ...f, stock: e.target.value }))} placeholder="库存" />
              </div>
              <input className="field" value={giftForm.desc} onChange={(e) => setGiftForm((f) => ({ ...f, desc: e.target.value }))} placeholder="描述" maxLength={80} />
              <button className="btn btn-fill" type="submit">创建装扮</button>
            </form>
            {gifts.map((g) => (
              <div className="admin-row admin-medal" key={g.id}>
                <div className="admin-dress-preview">
                  <DressPreview gift={g} />
                </div>
                <div className="grow admin-medal-fields">
                  <input className="field" value={g.name} onChange={(e) => patchGift(g.id, { name: e.target.value })} />
                  <input className="field" value={g.desc || ""} onChange={(e) => patchGift(g.id, { desc: e.target.value })} placeholder="描述" />
                  <div className="admin-appoint-row">
                    <input className="field" value={(g.payload && g.payload.mark) || ""} onChange={(e) => patchGiftPayload(g.id, { mark: e.target.value })} placeholder="角标" maxLength={2} />
                    <input className="field" type="color" value={(g.payload && g.payload.color) || "#ff2442"} onChange={(e) => patchGiftPayload(g.id, { color: e.target.value })} />
                    <input className="field" type="color" value={(g.payload && g.payload.color2) || "#fbbf24"} onChange={(e) => patchGiftPayload(g.id, { color2: e.target.value })} />
                    <input className="field admin-num" type="number" min="0" value={g.cost} onChange={(e) => patchGift(g.id, { cost: Number(e.target.value) })} />
                    <input className="field admin-num" type="number" min="0" value={g.stock} onChange={(e) => patchGift(g.id, { stock: Number(e.target.value) })} />
                  </div>
                </div>
                <button type="button" onClick={() => saveGift(g)}>保存</button>
                <button type="button" onClick={() => removeGift(g)}>删除</button>
              </div>
            ))}
           {gifts.length === 0 ? <div className="empty">还没有装扮</div> : null}
         </>
       ) : null}
        {tab === "featured" ? (
          <>
            <p className="hint">指定首页轮播和圈子头条。保存后立刻生效；两栏都留空则按精华/置顶自动挑。</p>
            <form className="admin-search" onSubmit={searchFeat}>
              <input className="field" value={featQ} onChange={(e) => setFeatQ(e.target.value)} placeholder="搜帖子 ID 或标题" />
              <button className="btn" type="submit">搜索</button>
            </form>
            {featHits.map((p) => (
              <div className="feat-hit" key={p.id}>
                <div className="grow">
                  <b>#{p.id} {p.title}</b>
                  <div className="hint">{p.board?.name || "版块"} · {p.author?.nickname || ""}</div>
                </div>
                <button type="button" onClick={() => addFeat(featBanners, setFeatBanners, p, 4)}>加入轮播</button>
                <button type="button" onClick={() => addFeat(featCommunity, setFeatCommunity, p, 3)}>加入圈子</button>
              </div>
            ))}
            <h3 className="music-sec">首页轮播（最多 4）</h3>
            {featBanners.length ? featBanners.map((p, i) => (
              <div className="admin-row" key={`b-${p.id}`}>
                <div className="grow"><b>#{p.id} {p.title}</b></div>
                <button type="button" onClick={() => moveFeat(featBanners, setFeatBanners, i, -1)}>上移</button>
                <button type="button" onClick={() => moveFeat(featBanners, setFeatBanners, i, 1)}>下移</button>
                <button type="button" onClick={() => setFeatBanners((list) => list.filter((x) => x.id !== p.id))}>移除</button>
              </div>
            )) : <div className="empty">空着则自动挑选轮播</div>}
            <h3 className="music-sec">圈子推荐（最多 3）</h3>
            {featCommunity.length ? featCommunity.map((p, i) => (
              <div className="admin-row" key={`c-${p.id}`}>
                <div className="grow"><b>#{p.id} {p.title}</b></div>
                <button type="button" onClick={() => moveFeat(featCommunity, setFeatCommunity, i, -1)}>上移</button>
                <button type="button" onClick={() => moveFeat(featCommunity, setFeatCommunity, i, 1)}>下移</button>
                <button type="button" onClick={() => setFeatCommunity((list) => list.filter((x) => x.id !== p.id))}>移除</button>
              </div>
            )) : <div className="empty">空着则沿用轮播第一条</div>}
            <button className="btn btn-fill" type="button" onClick={saveFeatured}>保存推荐位</button>
          </>
        ) : null}
        {tab === "shop" ? (
          <>
            <p className="hint">VIP / SVIP 套餐和靓号上下架。号码范围 10001–99999999999，10001 为超级管理员。用户端只卖已上架且未被占用的号码。</p>
            <h3 className="music-sec">会员套餐</h3>
            {shopPlans.map((p, i) => (
              <div className="admin-row" key={p.slug}>
                <b>{p.name}</b>
                <label className="hint">天数
                  <input className="field admin-num" type="number" value={p.days} onChange={(e) => setShopPlans((list) => list.map((x, j) => j === i ? { ...x, days: Number(e.target.value) } : x))} />
                </label>
                <label className="hint">葫芦
                  <input className="field admin-num" type="number" value={p.cost} onChange={(e) => setShopPlans((list) => list.map((x, j) => j === i ? { ...x, cost: Number(e.target.value) } : x))} />
                </label>
                <button type="button" onClick={() => setShopPlans((list) => list.map((x, j) => j === i ? { ...x, enabled: !x.enabled } : x))}>{p.enabled ? "开放中" : "已关闭"}</button>
              </div>
            ))}
            <button className="btn btn-fill" type="button" onClick={saveShopPlans}>保存套餐</button>
            <h3 className="music-sec">靓号目录</h3>
            <form className="admin-search" onSubmit={(e) => { e.preventDefault(); loadShop(shopQ).catch((err) => toast(err.message)); }}>
              <input className="field" value={shopQ} onChange={(e) => setShopQ(e.target.value)} placeholder="搜索号码或占用者" />
              <button className="btn btn-line" type="submit">搜索</button>
            </form>
            <form className="admin-search" onSubmit={addShopPretty}>
              <input className="field" value={shopUin} onChange={(e) => setShopUin(e.target.value)} placeholder="号码 10001-99999999999" />
              <input className="field admin-num" type="number" value={shopCost} onChange={(e) => setShopCost(e.target.value)} placeholder="葫芦价" />
              <button className="btn btn-fill" type="submit">上架</button>
            </form>
            {shopPretty.map((item) => (
              <div className="admin-row" key={item.uin}>
                <div className="grow">
                  <b>{item.uin}</b>
                  <div className="hint">{item.taken ? `已被 ${item.holder} 占用` : (item.enabled ? "在售" : "已下架")}</div>
                </div>
                <input className="field admin-num pretty-cost" type="number" defaultValue={item.cost} />
                <button type="button" onClick={(e) => {
                  const input = e.currentTarget.previousElementSibling;
                  const cost = Number(input && input.value);
                  patchPretty(item, { cost, enabled: item.enabled });
                  toast("已保存");
                }}>保存</button>
                <button type="button" onClick={() => patchPretty(item, { cost: item.cost, enabled: !item.enabled })}>{item.enabled ? "下架" : "上架"}</button>
                <button type="button" className="danger" onClick={() => removePretty(item)}>删除</button>
              </div>
            ))}
            {shopPretty.length === 0 ? <div className="empty">还没有靓号，先上架几个</div> : null}
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
        {tab === "trash" ? (
          trash.length ? trash.map((p) => (
            <div className="admin-row" key={p.id}>
              <div className="grow">
                <Link to={`/post/${p.id}`}><b>{p.title}</b></Link>
                <div className="hint">{p.author?.nickname} · {p.board?.name} · {p.trashedAt}</div>
              </div>
              <button type="button" onClick={() => restorePost(p.id)}>还原</button>
              <button type="button" onClick={() => purgePost(p.id)}>彻底删除</button>
            </div>
          )) : <div className="empty">回收站是空的</div>
        ) : null}
        {tab === "parse" ? (
          <>
            <label className="field-lab">每次解析扣葫芦
              <input className="field" type="number" min="0" max="999" value={parseCost} onChange={(e) => setParseCost(e.target.value)} />
            </label>
            <button className="btn btn-fill" type="button" onClick={saveParseCost}>保存扣费</button>
            <div className="admin-legend">
              {parseStats.map((s) => (
                <div key={s.id}>
                  <b>{s.name}</b>
                  <span>{s.calls} 次 · 成功 {s.ok} · 均 {s.avgMs}ms</span>
                </div>
              ))}
            </div>
            <form className="admin-board-form stack" onSubmit={addParseApi}>
              <b>新增远程接口</b>
              <label className="field-lab">名称<input className="field" value={apiForm.name} onChange={(e) => setApiForm((f) => ({ ...f, name: e.target.value }))} placeholder="通用解析" /></label>
              <label className="field-lab">slug<input className="field" value={apiForm.slug} onChange={(e) => setApiForm((f) => ({ ...f, slug: e.target.value }))} placeholder="douyin 或 *" /></label>
              <label className="field-lab">请求地址<input className="field" value={apiForm.apiUrl} onChange={(e) => setApiForm((f) => ({ ...f, apiUrl: e.target.value }))} placeholder="https://host/api?url= 或 url={url}" /></label>
              <label className="field-lab">排序<input className="field" type="number" value={apiForm.sort} onChange={(e) => setApiForm((f) => ({ ...f, sort: e.target.value }))} /></label>
              <label className="field-lab">数据路径<input className="field" value={apiForm.respData} onChange={(e) => setApiForm((f) => ({ ...f, respData: e.target.value }))} placeholder="data 可空" /></label>
              <label className="field-lab">视频路径<input className="field" value={apiForm.respVideo} onChange={(e) => setApiForm((f) => ({ ...f, respVideo: e.target.value }))} placeholder="playAddr 可空" /></label>
              <label className="field-lab">标题路径<input className="field" value={apiForm.respTitle} onChange={(e) => setApiForm((f) => ({ ...f, respTitle: e.target.value }))} placeholder="title 可空" /></label>
              <label className="field-lab">图集路径<input className="field" value={apiForm.respImg} onChange={(e) => setApiForm((f) => ({ ...f, respImg: e.target.value }))} placeholder="pics 可空" /></label>
              <button className="btn btn-gourd" type="submit">添加接口</button>
            </form>
            {parseApis.map((a) => (
              <div className="admin-row" key={a.id}>
                <div className="grow">
                  <b>{a.name}</b>
                  <div className="hint">{a.slug} · {a.apiUrl}</div>
                </div>
                <button type="button" onClick={() => toggleParseApi(a)}>{a.enabled ? "停用" : "启用"}</button>
                <button type="button" className="warn" onClick={() => removeParseApi(a)}>移除</button>
              </div>
            ))}
            <form className="admin-appoint-row" onSubmit={searchParseLogs}>
              <input className="field grow" value={parseQ} onChange={(e) => setParseQ(e.target.value)} placeholder="搜昵称、平台、标题" />
              <button className="btn" type="submit">搜索记录</button>
            </form>
            {parseLogs.length ? parseLogs.map((l) => (
              <div className="admin-row" key={l.id}>
                <div className="grow">
                  <b>{l.ok ? (l.title || "成功") : (l.error || "失败")}</b>
                  <div className="hint">{l.nickname || l.userId} · {l.platform || "—"} · {l.ok ? `扣 ${l.cost}` : "未扣"} · {l.durationMs}ms</div>
                </div>
                <em className="hint">{String(l.createdAt || "").slice(0, 16).replace("T", " ")}</em>
              </div>
            )) : <div className="empty">还没有解析记录</div>}
          </>
        ) : null}
        {tab === "apps" ? (
          <>
            <p className="hint">消息页顶部小应用，最多 12 个。路径填站内路由如 /parse，或 http 外链。</p>
            <form className="admin-appoint-row" onSubmit={(e) => {
              e.preventDefault();
              const name = appForm.name.trim();
              const path = appForm.path.trim();
              if (!name || !path) return toast("填写名称和路径");
              setMiniApps((list) => [...list, {
                id: `app-${Date.now()}`,
                name,
                path,
                color: appForm.color || "#ff2442",
                mark: (appForm.mark || name).slice(0, 2)
              }]);
              setAppForm({ name: "", path: "", color: "#ff2442", mark: "" });
            }}>
              <input className="field" value={appForm.name} onChange={(e) => setAppForm((f) => ({ ...f, name: e.target.value }))} placeholder="名称" maxLength={8} />
              <input className="field" value={appForm.path} onChange={(e) => setAppForm((f) => ({ ...f, path: e.target.value }))} placeholder="路径 /parse 或链接" />
              <input className="field" value={appForm.mark} onChange={(e) => setAppForm((f) => ({ ...f, mark: e.target.value }))} placeholder="角标" maxLength={2} />
              <input className="field" type="color" value={appForm.color} onChange={(e) => setAppForm((f) => ({ ...f, color: e.target.value }))} />
              <button className="btn" type="submit">加入</button>
            </form>
            {miniApps.map((a, i) => (
              <div className="admin-row" key={a.id || i}>
                <i className="medal-dot" style={{ background: a.color }}>{a.mark}</i>
                <div className="grow admin-medal-fields">
                  <input className="field" value={a.name} onChange={(e) => setMiniApps((list) => list.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                  <input className="field" value={a.path} onChange={(e) => setMiniApps((list) => list.map((x, j) => j === i ? { ...x, path: e.target.value } : x))} />
                </div>
                <button type="button" onClick={() => setMiniApps((list) => {
                  if (i < 1) return list;
                  const next = list.slice();
                  const t = next[i - 1]; next[i - 1] = next[i]; next[i] = t;
                  return next;
                })}>上移</button>
                <button type="button" onClick={() => setMiniApps((list) => {
                  if (i >= list.length - 1) return list;
                  const next = list.slice();
                  const t = next[i + 1]; next[i + 1] = next[i]; next[i] = t;
                  return next;
                })}>下移</button>
                <button type="button" className="danger" onClick={() => setMiniApps((list) => list.filter((_, j) => j !== i))}>移除</button>
              </div>
            ))}
            {miniApps.length === 0 ? <div className="empty">还没有小应用</div> : null}
            <button className="btn btn-fill" type="button" onClick={async () => {
              try {
                const d = await api("/api/admin/mini-apps", { method: "PUT", body: { apps: miniApps } });
                setMiniApps(d.apps || []);
                toast("小应用已保存");
              } catch (e) {
                toast(e.message);
              }
            }}>保存小应用</button>
          </>
        ) : null}
        {tab === "reports" ? (
          reports.length ? reports.map((r) => (
            <div className="admin-row" key={r.id}>
              <div className="grow">
                <b>{r.targetType === "comment" ? "评论" : "帖子"} #{r.targetId} · {r.reason}</b>
                <div className="hint">{r.detail}</div>
                <div className="hint">{(r.from && r.from.nickname) || "会员"} 举报 {(r.targetUser && r.targetUser.nickname) || "目标"} · {r.status === "open" ? "待处理" : "已处理"}</div>
                {r.status === "open" ? (
                  <button type="button" className="btn btn-fill" onClick={async () => {
                    const note = window.prompt("处理备注", "") || "";
                    try {
                      const d = await api(`/api/admin/reports/${r.id}`, { method: "PUT", body: { note } });
                      setReports(d.reports || []);
                      toast("已处理");
                    } catch (e) {
                      toast(e.message);
                    }
                  }}>标为已处理</button>
                ) : <div className="hint">{r.note} · {String(r.handledAt || "").slice(0, 16)}</div>}
              </div>
            </div>
          )) : <div className="empty">还没有举报</div>
        ) : null}
        {tab === "words" ? (
          <div className="stack">
            <p className="hint">每行一条，立即用于发帖和评论</p>
            <textarea className="field" rows={10} value={words} onChange={(e) => setWords(e.target.value)} placeholder="敏感词，一行一条" />
            <button type="button" className="btn btn-fill" onClick={async () => {
              try {
                const d = await api("/api/admin/words", { method: "PUT", body: { words } });
                setWords(d.words || "");
                toast("敏感词已保存");
              } catch (e) {
                toast(e.message);
              }
            }}>保存敏感词</button>
          </div>
        ) : null}
        {tab === "logs" ? (
          logs.length ? logs.map((l) => {
            const actName = {
              ban: "封禁", unban: "解封", mute: "禁言", unmute: "解除禁言",
              role_admin: "设为管理员", role_user: "取消管理员",
              user_edit: "编辑用户", user_password: "重置密码",
              board_create: "创建版块", board_edit: "编辑版块", board_delete: "删除版块", board_rules: "更新版规",
              medal_create: "创建勋章", medal_delete: "删除勋章",
              gift_create: "创建装扮", gift_edit: "编辑装扮", gift_delete: "删除装扮",
              parse_cost: "解析扣费", parse_api: "解析接口",
              featured: "推荐位",
              shop_plans: "会员套餐", shop_pretty: "靓号上下架", yy_api: "电台接口",
              user_vip: "赠会员", user_uin: "改青葫号",
              mini_apps: "小应用"
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
            <label className="field-lab">认证类型
              <select className="field" value={editing.verifyKind || ""} onChange={(e) => setEditing((f) => ({ ...f, verifyKind: e.target.value }))}>
                <option value="">无认证</option>
                <option value="person">个人认证</option>
                <option value="org">企业认证</option>
                <option value="official">官方认证</option>
              </select>
            </label>
            <label className="field-lab">认证说明<input className="field" value={editing.verifyTitle || ""} onChange={(e) => setEditing((f) => ({ ...f, verifyTitle: e.target.value }))} placeholder="如：青葫三楼官方账号" maxLength={24} /></label>
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
