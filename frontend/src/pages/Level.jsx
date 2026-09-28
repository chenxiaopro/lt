import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context.jsx";
import { UserAvatar } from "../components/Dress.jsx";
import { BackIco } from "../icons.jsx";

export default function Level() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [pack, setPack] = useState({ levels: [], rules: [] });

  useEffect(() => {
    api("/api/levels").then(setPack).catch(() => {});
  }, []);

  if (!user) {
    nav("/login");
    return null;
  }

  const remain = Math.max(0, (user.nextExp || 0) - (user.exp || 0));
  const color = user.titleColor || "#ff2442";
  const pct = Math.max(0, Math.min(100, Number(user.progress) || 0));
  const groups = [];
  (pack.rules || []).forEach((r) => {
    const g = groups.find((x) => x.name === r.group);
    if (g) g.rows.push(r);
    else groups.push({ name: r.group, rows: [r] });
  });

  return (
    <div className="layout single">
      <div className="lv-page">
        <div className="lv-hero">
          <UserAvatar user={user} size="xl" />
          <h2>
            {user.nickname}
            <i className="lv-badge" style={{ background: color }}>LV {user.level}</i>
          </h2>
          <div className="xp-track lg" style={{ "--xp": color }} aria-label="经验进度">
            <i className="xp-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="xp-meta">
            <span>{user.title}</span>
            <span>{user.maxLevel ? "满级" : user.nextTitle}</span>
          </div>
          <p className="lv-tip">
            {user.maxLevel
              ? `当前经验值 ${user.exp.toLocaleString()} · 已满级`
              : `当前经验值 ${user.exp.toLocaleString()} · 距离 LV${user.level + 1} 还需 ${remain.toLocaleString()}`}
          </p>
        </div>
        {groups.map((g) => (
          <section className="lv-sec" key={g.name}>
            <h3>{g.name === "日常任务" ? "经验获得方式" : g.name}</h3>
            <table className="lv-table">
              <thead>
                <tr><th>{g.name}</th><th>获得经验</th></tr>
              </thead>
              <tbody>
                {g.rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>
                      <b>{r.exp}</b>
                      {r.note ? <em>{r.note}</em> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
        <section className="lv-sec">
          <h3>经验等级明细</h3>
          <table className="lv-table">
            <thead>
              <tr><th>等级</th><th>经验</th></tr>
            </thead>
            <tbody>
              {(pack.levels || []).map((r) => (
                <tr key={r.level} className={r.level === user.level ? "on" : ""}>
                  <td>LV {r.level} · {r.title}</td>
                  <td>{Number(r.exp || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <p className="hint lv-foot"><Link to="/me">返回我的</Link></p>
      </div>
    </div>
  );
}

export function LevelBack() {
  const nav = useNavigate();
  return (
    <button className="ico-btn dark" type="button" onClick={() => nav(-1)} aria-label="返回"><BackIco /></button>
  );
}
