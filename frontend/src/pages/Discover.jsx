import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context.jsx";
import { CheckIco, GiftIco, TrophyIco, SoftIco } from "../icons.jsx";
import { DressPreview, Level, MedalWall, UserAvatar } from "../components/Dress.jsx";

export default function Discover() {
  const { user, setUser, toast } = useAuth();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [tab, setTab] = useState(sp.get("tab") || "task");
  const [ranks, setRanks] = useState({ masters: [], harvest: [], checkin: [], hotPosts: [] });
  const [gifts, setGifts] = useState([]);
  const [banner, setBanner] = useState(null);
  const [medals, setMedals] = useState([]);

  useEffect(() => {
    api("/api/rankings").then(setRanks).catch(() => {});
    api("/api/home").then((d) => setBanner((d.banners || [])[0])).catch(() => {});
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
    { name: "每日签到", desc: "连签葫芦翻倍", reward: "+2 起", to: "/" },
    { name: "发一篇有用的帖", desc: "经验与葫芦双加", reward: "+12 / +5", to: "/publish" },
    { name: "回 3 层楼", desc: "把话题聊热", reward: "+9 / +3", to: "/" },
    { name: "关注一个版块", desc: "关注流更准", reward: "关注", to: "/community" }
  ];

  return (
    <div className="layout single">
      <div className="disc-page">
        {banner ? (
          <Link className="disc-banner" to={`/post/${banner.id}`}>
            <img src={(banner.images && banner.images[0]) || banner.author.avatar} alt="" />
            <div className="cap">
              <h3>{banner.title}</h3>
              <p>{banner.board?.name} · {banner.likeCount} 赞</p>
            </div>
          </Link>
        ) : null}
        <div className="shortcut-card">
          {[
            ["task", "任务", <CheckIco key="a" size={22} />, "#7c5cff"],
            ["gift", "兑换", <GiftIco key="b" size={22} />, "#f59e0b"],
            ["rank", "排行榜", <TrophyIco key="c" size={22} />, "#f97316"],
            ["soft", "软件", <SoftIco key="d" size={22} />, "#60a5fa"]
          ].map(([k, label, ico, color]) => (
            k === "soft" ? (
              <Link key={k} className="disc-sc" to="/soft">
                <span style={{ background: color }}>{ico}</span>
                {label}
              </Link>
            ) : (
              <button key={k} className={`disc-sc ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>
                <span style={{ background: color }}>{ico}</span>
                {label}
              </button>
            )
          ))}
        </div>
        {tab === "task" && (
          <div className="card tight">
            <h4 className="disc-h">每日任务</h4>
            {tasks.map((t) => (
              <Link className="app-row" key={t.name} to={t.to}>
                <div className="grow">
                  <b>{t.name}</b>
                  <div className="hint">{t.desc} · {t.reward}</div>
                </div>
                <span className="pill">去完成</span>
              </Link>
            ))}
          </div>
        )}
        {tab === "gift" && (
          <div className="card tight">
            <div className="row-between" style={{ padding: "8px 4px 12px" }}>
              <b>装扮兑换</b>
              <span className="hint">葫芦 {user?.gourd || 0}</span>
            </div>
            <div className="dress-shop">
              {[
                ["frame", "头像框"],
                ["badge", "铭牌"],
                ["title", "称号"],
                ["bubble", "气泡"]
              ].map(([kind, label]) => (
                <section key={kind}>
                  <h4>{label}</h4>
                  <div className="dress-grid">
                    {gifts.filter((g) => g.kind === kind).map((g) => (
                      <div className={`dress-card ${g.equipped ? "on" : ""}`} key={g.id}>
                        <div className="dress-preview">
                          <DressPreview gift={g} face={user?.avatar} />
                        </div>
                        <b>{g.name}</b>
                        <span className="hint">{g.desc}</span>
                        <span className="hint">{g.owned ? "已拥有" : `${g.cost} 葫芦`}</span>
                        <button className="pill" onClick={() => redeem(g.id)}>
                          {g.equipped ? "佩戴中" : g.owned ? "佩戴" : "兑换"}
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
            <h4 className="disc-h">勋章图鉴</h4>
            <p className="hint" style={{ padding: "0 4px 8px" }}>签到、发帖、回帖、升级会自动点亮。</p>
            <MedalWall medals={medals} empty="勋章加载中" />
          </div>
        )}
        {tab === "rank" && (
          <div className="card tight">
            <h4 className="disc-h">大神榜</h4>
            {ranks.masters.map((u, i) => (
              <Link className="app-row" key={u.id} to={`/user/${u.id}`}>
                <span className={`ord n${i + 1}`}>{i + 1}</span>
                <UserAvatar user={u} size="sm" />
                <div className="grow">
                  <b>{u.nickname}</b>
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
                  <b>{u.nickname}</b>
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
