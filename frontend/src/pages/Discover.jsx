import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context.jsx";
import { DressPreview, Level, MedalWall, UserAvatar, UserName } from "../components/Dress.jsx";
import { CheckinBar } from "./Side.jsx";

const ENTRIES = [
  { id: "task", label: "玩游戏赚葫芦", desc: "连签开宝箱，发帖回帖都涨葫芦", color: "#5b8def", tone: "#eef4ff" },
  { id: "dress", label: "装饰中心", desc: "头像框 · 聊天框 · 主页装扮", color: "#f472b6", tone: "#fff1f7", tag: "上新" },
  { id: "gift", label: "礼物兑换中心", desc: "葫芦换勋章和装扮", color: "#f5a623", tone: "#fff8e8" },
  { id: "rank", label: "活动榜", desc: "大神榜、收获榜轮番上场", color: "#f7c948", tone: "#fffbe6" }
];

export default function Discover() {
  const { user, setUser, toast } = useAuth();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const tab = sp.get("tab") || "";
  const [ranks, setRanks] = useState({ masters: [], harvest: [], checkin: [], hotPosts: [] });
  const [gifts, setGifts] = useState([]);
  const [banner, setBanner] = useState(null);
  const [medals, setMedals] = useState([]);
  const [dressKind, setDressKind] = useState("frame");

  useEffect(() => {
    api("/api/rankings").then(setRanks).catch(() => {});
    api("/api/home").then((d) => setBanner(((d.community || [])[0]) || (d.banners || [])[0] || null)).catch(() => {});
  }, []);

  useEffect(() => {
    api("/api/gifts").then((d) => setGifts(d.gifts || [])).catch(() => {});
    api("/api/medals").then((d) => setMedals(d.medals || [])).catch(() => {});
  }, [user]);

  async function redeem(id) {
    if (!user) return nav("/login");
    try {
      const d = await api(`/api/gifts/${id}/redeem`, { method: "POST" });
      setUser(d.user);
      toast(d.gift?.owned ? `已佩戴 ${d.gift.name}` : `兑换成功：${d.gift?.name || "装扮"}`);
      const g = await api("/api/gifts");
      setGifts(g.gifts || []);
    } catch (e) {
      toast(e.message);
    }
  }

  const tasks = [
    { name: "发一篇有用的帖", desc: "经验与葫芦双加", reward: "+12 经验 / +5 葫芦", to: "/publish", color: "#ff2442", wide: true },
    { name: "回 3 层楼", desc: "把话题聊热", reward: "+9 经验 / +3 葫芦", to: "/", color: "#f59e0b" },
    { name: "关注一个版块", desc: "关注流更准", reward: "解锁关注流", to: "/community", color: "#5b8def" },
    { name: "去一次水印", desc: "小工具也涨手感", reward: "解析记录", to: "/parse", color: "#10b981" },
    { name: "换一款装扮", desc: "头像框聊天框上新", reward: "个性展示", to: "/discover?tab=dress", color: "#f472b6" }
  ];

  const KINDS = [
    ["card", "主页装扮"],
    ["frame", "头像框"],
    ["bubble", "聊天框"]
  ];
  const worn = user && user.dress && user.dress[dressKind];
  const shopList = gifts.filter((g) => g.kind === dressKind);

  const shop = (
    <div className="dress-shop decor-shop">
      <div className="decor-stage">
        {dressKind === "bubble" ? (
          <div className="decor-chat">
            <div className="decor-chat-row">
              {user ? <UserAvatar user={user} size="sm" /> : null}
              <DressPreview gift={worn ? { kind: "bubble", slug: worn.slug, payload: worn } : { kind: "bubble", payload: { style: "shiba", color: "#f59e0b", color2: "#fff7ed", mark: "柴" } }} />
            </div>
            <div className="decor-chat-row mine">
              <DressPreview gift={{ kind: "bubble", payload: { style: "corgi", color: "#f59e0b", color2: "#fff7ed", mark: "柯" } }} />
              {user ? <UserAvatar user={user} size="sm" /> : null}
            </div>
          </div>
        ) : dressKind === "card" ? (
          <DressPreview gift={worn ? { kind: "card", name: worn.name, payload: worn } : { kind: "card", name: "主页装扮", payload: { style: "seal", color: "#ff2442", color2: "#fbbf24" } }} />
        ) : (
          <UserAvatar
            user={user ? { ...user, dress: { ...user.dress, frame: dressKind === "frame" ? worn : user.dress && user.dress.frame } } : { avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=qinghu&backgroundColor=fff6ec", dress: { frame: worn } }}
            size="xl"
          />
        )}
      </div>
      <div className="decor-chips">
        {KINDS.map(([kind, label]) => (
          <button type="button" key={kind} className={dressKind === kind ? "on" : ""} onClick={() => setDressKind(kind)}>{label}</button>
        ))}
      </div>
      <div className="dress-grid three">
        {shopList.map((g) => (
          <button type="button" className={`dress-card ${g.equipped ? "on" : ""}`} key={g.id} onClick={() => redeem(g.id)}>
            <div className="dress-preview">
              <DressPreview gift={g} />
            </div>
            <b>{g.name}</b>
            <span className="gourd-cost">{g.equipped ? "佩戴中" : g.owned ? "已拥有" : `${g.cost} 葫芦`}</span>
          </button>
        ))}
      </div>
    </div>
  );

  if (!tab) {
    return (
      <div className="layout single">
        <div className="plaza">
          <div className="plaza-hero">
            <p>发现广场</p>
            <h2>今日装扮上新</h2>
            <span>头像框、聊天框、主页装扮，进装饰中心换</span>
            <button type="button" className="plaza-cta" onClick={() => nav("/discover?tab=dress")}>去装饰中心</button>
          </div>
          {gifts.length ? (
            <div className="plaza-strip">
              {gifts.slice(0, 6).map((g) => (
                <button type="button" className="plaza-dress" key={g.id} onClick={() => nav("/discover?tab=dress")}>
                  <DressPreview gift={g} face={user?.avatar} />
                  <b>{g.name}</b>
                </button>
              ))}
            </div>
          ) : null}
          <div className="plaza-grid">
            {ENTRIES.map((item) => (
              <button key={item.id} type="button" className="plaza-tile" style={{ background: item.tone, "--tile": item.color }} onClick={() => nav(`/discover?tab=${item.id}`)}>
                <i style={{ background: item.color }} />
                <b>{item.label}{item.tag ? <em>{item.tag}</em> : null}</b>
                <span>{item.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="layout single">
      <div className="disc-page">
        {tab === "task" && (
          <div className="bazaar">
            <div className="bazaar-hero">
              <div className="bazaar-hero-txt">
                <p>任务集市</p>
                <h2>今日葫芦 {user?.gourd || 0}</h2>
                <span>连签 {user?.checkinStreak || 0} 天，宝箱在等你</span>
              </div>
              <CheckinBar />
            </div>
            <div className="bazaar-chests">
              {[
                [3, "3 天"],
                [7, "7 天"],
                [15, "15 天"],
                [30, "30 天"]
              ].map(([n, label]) => (
                <i key={n} className={(user?.checkinStreak || 0) >= n ? "got" : ""}>{label}</i>
              ))}
            </div>
            <div className="bazaar-grid">
              {tasks.map((t) => (
                <Link className={`bazaar-card${t.wide ? " wide" : ""}`} key={t.name} to={t.to}>
                  <i className="bazaar-dot" style={{ background: t.color }} />
                  <b>{t.name}</b>
                  <span>{t.desc}</span>
                  <em>{t.reward}</em>
                </Link>
              ))}
            </div>
          </div>
        )}
        {tab === "dress" && (
          <div className="card tight">
            <div className="row-between" style={{ padding: "8px 4px 12px" }}>
              <b>装饰中心</b>
              <span className="hint">葫芦 {user?.gourd || 0}</span>
            </div>
            {shop}
          </div>
        )}
        {tab === "gift" && (
          <div className="card tight">
            <div className="row-between" style={{ padding: "8px 4px 12px" }}>
              <b>礼物兑换中心</b>
              <span className="hint">葫芦 {user?.gourd || 0}</span>
            </div>
            {shop}
            <h4 className="disc-h">勋章图鉴</h4>
            <p className="hint" style={{ padding: "0 4px 8px" }}>签到、发帖、回帖、升级会自动点亮。</p>
            <MedalWall medals={medals} empty="勋章加载中" />
          </div>
        )}
        {tab === "rank" && (
          <div className="card tight">
            {banner ? (
              <Link className="disc-banner in-page" to={`/post/${banner.id}`}>
                <img src={(banner.images && banner.images[0]) || (banner.author && banner.author.avatar) || ""} alt="" />
                <div className="cap">
                  <h3>{banner.title}</h3>
                  <p>{banner.board?.name} · {banner.likeCount} 赞</p>
                </div>
              </Link>
            ) : null}
            <h4 className="disc-h">大神榜</h4>
            {ranks.masters.map((u, i) => (
              <Link className="app-row" key={u.id} to={`/user/${u.id}`}>
                <span className={`ord n${i + 1}`}>{i + 1}</span>
                <UserAvatar user={u} size="sm" />
                <div className="grow">
                  <b><UserName user={u} withLevel={false} /></b>
                  <div className="hint"><Level user={u} /></div>
                </div>
              </Link>
            ))}
            <h4 className="disc-h">收获榜</h4>
            {ranks.harvest.map((u, i) => (
              <Link className="app-row" key={"h" + u.id} to={`/user/${u.id}`}>
                <span className={`ord n${i + 1}`}>{i + 1}</span>
                <UserAvatar user={u} size="sm" />
                <div className="grow">
                  <b><UserName user={u} withLevel={false} /></b>
                  <div className="hint">{u.gourd} 葫芦</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
