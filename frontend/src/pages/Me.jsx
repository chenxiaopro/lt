import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, getHistory } from "../api.js";
import { useAuth } from "../context.jsx";
import { PostRow } from "../components/PostCard.jsx";
import { GearIco, BackIco, PenIco, ChatIco, StarIco, ClockIco, GiftIco, UserIco, ChevronIco, RefreshIco, SoftIco, MusicIco, TrophyIco } from "../icons.jsx";
import { HonorChips, LevelProgress, MedalRow, MedalWall, UinLine, UserAvatar, UserName, VipCrowns, WhoMeta, vipDaysLeft } from "../components/Dress.jsx";

const ME_TABS = new Set(["posts", "replies", "collect", "history", "following", "fans", "profile", "security", "medals", "account", "blocks"]);

export default function Me() {
  const { user, setUser, logout, toast } = useAuth();
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const panel = ME_TABS.has(sp.get("tab")) ? sp.get("tab") : null;
  function setPanel(key) {
    const next = new URLSearchParams(sp);
    if (key) next.set("tab", key);
    else next.delete("tab");
    setSp(next);
  }
  const [posts, setPosts] = useState([]);
  const [replies, setReplies] = useState([]);
  const [collects, setCollects] = useState([]);
  const [following, setFollowing] = useState({ users: [], boards: [] });
  const [followers, setFollowers] = useState([]);
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState({ nickname: "", bio: "", gender: "保密", city: "", birthday: "", hometown: "", school: "", email: "" });
  const [blocks, setBlocks] = useState([]);
  const [album, setAlbum] = useState([]);
  const [pw, setPw] = useState({ old: "", next: "", again: "" });
  const [geo, setGeo] = useState(null);
  const [shop, setShop] = useState({ pretty: [], plans: [], vipCost: 88, vipDays: 30 });
  const [shopReady, setShopReady] = useState(false);
  const [shopErr, setShopErr] = useState("");
  const [vipAsk, setVipAsk] = useState(null);

  useEffect(() => {
    if (!user) return nav("/login");
    setForm({ nickname: user.nickname, bio: user.bio, gender: user.gender, city: user.city, birthday: user.birthday || "", hometown: user.hometown || "", school: user.school || "", email: user.email || "" });
    api(`/api/users/${user.id}/photos`).then((d) => setAlbum(d.photos || [])).catch(() => {});
    api(`/api/users/${user.id}/posts`).then((d) => setPosts(d.posts || [])).catch(() => {});
    api(`/api/users/${user.id}/replies`).then((d) => setReplies(d.replies || [])).catch(() => {});
    api(`/api/users/${user.id}/collects`).then((d) => setCollects(d.posts || [])).catch(() => {});
    api(`/api/users/${user.id}/following`).then((d) => setFollowing({ users: d.users || [], boards: d.boards || [] })).catch(() => {});
    api(`/api/users/${user.id}/followers`).then((d) => setFollowers(d.users || [])).catch(() => {});
    setHistory(getHistory());
    api("/api/me/blocks").then((d) => setBlocks(d.users || [])).catch(() => setBlocks([]));
  }, [user]);

  useEffect(() => {
    api("/api/ip").then(setGeo).catch(() => {});
  }, []);

  useEffect(() => {
    if (panel !== "account" || !user) return;
    setShopReady(false);
    setShopErr("");
    api("/api/account").then((d) => {
      setShop({ pretty: d.pretty || [], plans: d.plans || [], vipCost: d.vipCost || 88, vipDays: d.vipDays || 30 });
      if (d.user) setUser(d.user);
    }).catch((e) => {
      setShopErr(e.message || "号店加载失败");
    }).finally(() => setShopReady(true));
  }, [panel, user && user.id]);

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

  async function buyVip(slug) {
    try {
      const d = await api("/api/account/vip", { method: "POST", body: { slug: slug || "vip" } });
      setUser(d.user);
      setVipAsk(null);
      toast(`${d.plan === "svip" ? "SVIP" : "VIP"} 已开通 ${d.days} 天`);
    } catch (e) {
      toast(e.message);
    }
  }

  async function buyUin(uin) {
    try {
      const d = await api("/api/account/uin", { method: "POST", body: { uin } });
      setUser(d.user);
      setShop((s) => ({ ...s, pretty: (s.pretty || []).filter((x) => x.uin !== uin) }));
      toast(`已换成青葫号 ${d.uin}`);
    } catch (e) {
      toast(e.message);
    }
  }

  async function uploadAsset(e, field, ok) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("files", file);
    try {
      const up = await api("/api/upload", { method: "POST", body: fd });
      const url = (up.urls || [])[0];
      if (!url) return;
      const d = await api("/api/users/me", { method: "PUT", body: { ...form, [field]: url } });
      setUser(d.user);
      toast(ok);
    } catch (err) {
      toast(err.message);
    }
  }

  if (!user) return null;

  const threadPosts = posts.filter((p) => (p.board && p.board.slug) !== "pool");
  const menus = [
    { key: "posts", label: "我的帖子", count: user.threadCount ?? threadPosts.length, color: "#f59e0b", ico: <PenIco size={18} /> },
    { key: "replies", label: "我的回复", count: replies.length, color: "#38bdf8", ico: <ChatIco size={18} /> },
    { key: "collect", label: "我的收藏", count: collects.length, color: "#fb7185", ico: <StarIco size={18} /> },
    { key: "history", label: "浏览历史", count: history.length, color: "#fbbf24", ico: <ClockIco size={18} /> },
    { key: "soft", label: "软件库", to: "/soft", color: "#60a5fa", ico: <SoftIco size={18} /> },
    { key: "music", label: "三楼电台", to: "/music", color: "#34d399", ico: <MusicIco size={18} /> },
    { key: "gift", label: "任务集市", to: "/discover", color: "#a78bfa", ico: <GiftIco size={18} /> },
    { key: "account", label: "青葫号", count: user.uin || "", color: "#f59e0b", ico: <UserIco size={18} /> },
    { key: "blocks", label: "黑名单", count: blocks.length, color: "#64748b", ico: <UserIco size={18} /> },
    { key: "medals", label: "我的勋章", count: user.medals ? user.medals.length : 0, color: "#f59e0b", ico: <TrophyIco size={18} /> },
    ...(user.isAdmin ? [
      { key: "status", label: "服务器检查", to: "/status", color: "#64748b", ico: <RefreshIco size={18} /> }
    ] : []),
    ...(user.isAdmin || user.isModerator ? [
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
      medals: "我的勋章",
      account: "青葫号",
      blocks: "黑名单"
    };

    if (panel === "account") {
      const left = vipDaysLeft(user);
      return (
        <div className="layout single">
          <div className="sheet">
            <div className="subhead">
              <button className="ico-btn dark" onClick={() => setPanel(null)} aria-label="返回"><BackIco /></button>
              <b>青葫号</b>
            </div>
            <div className="card me-sec">
              <div className="stack">
                <UinLine user={user} />
                <p className="hint">葫芦 {user.gourd || 0}{left ? ` · ${user.vipLabel || "会员"}剩余 ${left} 天` : " · 尚未开通会员"}</p>
                <div className="vip-plan-row">
                  {(shop.plans && shop.plans.length ? shop.plans : [
                    { slug: "vip", name: "VIP", cost: shop.vipCost, days: shop.vipDays },
                    { slug: "svip", name: "SVIP", cost: Math.max((shop.vipCost || 88) * 3, 288), days: shop.vipDays }
                  ]).map((p) => (
                    <button className={`vip-plan-btn ${p.slug}`} type="button" key={p.slug} onClick={() => setVipAsk(p)}>
                      <b>{user.vip && (p.slug === "svip" || user.vipTier === p.slug) ? `续费 ${p.name}` : `开通 ${p.name}`}</b>
                      <span>{p.cost} 葫芦 / {p.days} 天</span>
                    </button>
                  ))}
                </div>
                <h4 className="disc-h">靓号商城</h4>
                <div className="uin-shop">
                  {(shop.pretty || []).map((item) => (
                    <button type="button" className="uin-chip" key={item.uin} onClick={() => buyUin(item.uin)}>
                      <b>{item.uin}</b>
                      <span>{item.cost} 葫芦</span>
                    </button>
                  ))}
                </div>
                {shopErr ? <p className="hint warn">{shopErr}</p> : null}
                {!shopReady && !shopErr ? <p className="hint">靓号加载中...</p> : null}
                {shopReady && !(shop.pretty || []).length && !shopErr ? <p className="hint">靓号暂时售罄</p> : null}
              </div>
            </div>
            {vipAsk ? (
              <div className="modal-mask" onClick={() => setVipAsk(null)}>
                <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                  <h3>确认购买</h3>
                  <p>开通 {vipAsk.name}，花费 {vipAsk.cost} 葫芦，有效期 {vipAsk.days} 天。</p>
                  <div className="row-between" style={{ marginTop: 12, gap: 8 }}>
                    <button type="button" className="btn" onClick={() => setVipAsk(null)}>取消</button>
                    <button type="button" className="btn btn-fill" onClick={() => buyVip(vipAsk.slug)}>确认购买</button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      );
    }

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
                <label className="field-lab">头像
                  <span className="avatar-edit">
                    <UserAvatar user={user} size="lg" />
                    <input type="file" accept="image/*" hidden onChange={(e) => uploadAsset(e, "avatar", "头像已更新")} />
                  </span>
                </label>
                <label className="field-lab">空间封面
                  <span className="cover-edit">
                    {user.cover ? <img src={user.cover} alt="" /> : <i>点击上传封面</i>}
                    <input type="file" accept="image/*" hidden onChange={(e) => uploadAsset(e, "cover", "封面已更新")} />
                  </span>
                </label>
                <label className="field-lab">昵称
                  <input className="field" value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} placeholder="昵称" maxLength={16} />
                </label>
                <label className="field-lab">签名
                  <input className="field" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="这位葫芦丝还没签名" maxLength={80} />
                </label>
                <label className="field-lab">城市
                  <input className="field" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="城市" />
                </label>
                <label className="field-lab">家乡
                  <input className="field" value={form.hometown} onChange={(e) => setForm({ ...form, hometown: e.target.value })} placeholder="家乡" maxLength={32} />
                </label>
                <label className="field-lab">学校
                  <input className="field" value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} placeholder="学校" maxLength={40} />
                </label>
                <label className="field-lab">我的照片
                  <span className="hint">自己上传的相册，会出现在个人空间</span>
                  <div className="space-album">
                    {album.map((ph) => (
                      <button type="button" key={ph.id} className="space-pic" onClick={async () => {
                        try {
                          await api(`/api/users/me/photos/${ph.id}`, { method: "DELETE" });
                          setAlbum((list) => list.filter((x) => x.id !== ph.id));
                        } catch (err) {
                          toast(err.message);
                        }
                      }}>
                        <img src={ph.url} alt="" />
                        <em className="space-pic-x">×</em>
                      </button>
                    ))}
                    {album.length < 9 ? (
                      <label className="space-pic add">
                        +
                        <input type="file" accept="image/*" hidden onChange={async (e) => {
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
                            setAlbum((list) => [d.photo, ...list]);
                            toast("照片已添加");
                          } catch (err) {
                            toast(err.message);
                          }
                        }} />
                      </label>
                    ) : null}
                  </div>
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
                <label className="field-lab">邮箱
                  <input className="field" type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="用于找回密码" />
                </label>
                {(user.honors || []).filter((h) => h.title).length ? (
                  <label className="field-lab">展示称号
                    <select
                      className="select"
                      value={((user.honors || []).find((h) => h.shown) || (user.honors || [])[0] || {}).boardId || ""}
                      onChange={async (e) => {
                        try {
                          const d = await api("/api/honors/wear", { method: "POST", body: { boardId: Number(e.target.value) } });
                          setUser(d.user);
                          toast("已展示该称号");
                        } catch (err) {
                          toast(err.message);
                        }
                      }}
                    >
                      {(user.honors || []).filter((h) => h.title).map((h) => (
                        <option key={h.boardId} value={h.boardId}>{h.title}{h.boardName ? ` · ${h.boardName}` : ""}{h.expiresAt ? ` · 至 ${String(h.expiresAt).slice(0, 10)}` : ""}</option>
                      ))}
                    </select>
                  </label>
                ) : null}
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
                <button className="btn btn-line danger" onClick={async () => {
                  const password = window.prompt("输入登录密码以注销账号，此操作不可恢复");
                  if (!password) return;
                  if (!window.confirm("确认注销？帖子会保留为已注销用户")) return;
                  try {
                    await api("/api/account/delete", { method: "POST", body: { password } });
                    logout();
                    nav("/");
                    toast("账号已注销");
                  } catch (e) {
                    toast(e.message);
                  }
                }}>注销账号</button>
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
            following.users.map((u) => (
              <Link className="app-row" key={"u" + u.id} to={`/user/${u.id}`}>
                <UserAvatar user={u} size="sm" />
                <div className="grow">
                  <b><UserName user={u} withLevel={false} /></b>
                  <div className="hint">{u.bio || "还没有签名"}</div>
                </div>
              </Link>
            ))
          )}
          {panel === "fans" && followers.map((u) => (
            <Link className="app-row" key={u.id} to={`/user/${u.id}`}>
              <UserAvatar user={u} size="sm" />
              <div className="grow">
                <b><UserName user={u} withLevel={false} /></b>
                <div className="hint">{u.bio || "还没有签名"}</div>
              </div>
            </Link>
          ))}
          {panel === "blocks" && blocks.map((u) => (
            <div className="app-row" key={u.id}>
              <UserAvatar user={u} size="sm" />
              <div className="grow">
                <b><UserName user={u} withLevel={false} /></b>
                <div className="hint">拉黑于 {String(u.blockedAt || "").slice(0, 10)}</div>
              </div>
              <button type="button" className="btn" onClick={async () => {
                try {
                  await api(`/api/users/${u.id}/block`, { method: "POST" });
                  setBlocks((list) => list.filter((x) => x.id !== u.id));
                  toast("已取消拉黑");
                } catch (e) {
                  toast(e.message);
                }
              }}>取消拉黑</button>
            </div>
          ))}
          {panel === "blocks" && blocks.length === 0 ? <div className="empty">黑名单是空的</div> : null}
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
          <div
            className="me-enter"
            role="link"
            tabIndex={0}
            onClick={(e) => { if (e.target.closest("a")) return; nav(`/user/${user.id}`); }}
            onKeyDown={(e) => { if (e.key === "Enter") nav(`/user/${user.id}`); }}
          >
            <UserAvatar user={user} size="xl" />
            <h2><UserName user={user} /></h2>
          <UinLine user={user} />
          <VipCrowns user={user} />
          <MedalRow medals={user.medals} max={6} />
          <HonorChips user={user} />
          <p>{user.bio || "这位葫芦丝还没签名"}</p>
          <LevelProgress user={user} compact />
          <WhoMeta user={user} />
          {geo ? (
            <p className="ip-geo">
              IP属地 {[geo.country, geo.province, geo.city, geo.county].filter(Boolean).join(" ") || geo.label}
            </p>
          ) : null}
          <div className="me-stat">
            <div>
              <b>{user.following}</b><span>关注</span>
            </div>
            <i />
            <div>
              <b>{user.fans}</b><span>粉丝</span>
            </div>
          </div>
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
  if (panel === "following") return data.following.users.length === 0;
  if (panel === "fans") return data.followers.length === 0;
  return false;
}
