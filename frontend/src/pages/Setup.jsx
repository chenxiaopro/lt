import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context.jsx";

export default function Setup() {
  const { site, login, toast, setSite } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({
    siteName: "青葫三楼",
    tagline: "幸运、趣事尽在社区",
    username: "admin",
    nickname: "站长",
    password: ""
  });
  const [busy, setBusy] = useState(false);

  if (site && site.installed) return <Navigate to="/" replace />;

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const d = await api("/api/setup", { method: "POST", body: form });
      if (d.site && setSite) setSite(d.site);
      login(d.token, d.user);
      toast("全新社区已点亮");
      nav("/");
    } catch (err) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="hero-auth lucky-auth">
      <form className="auth-card setup-card" onSubmit={submit}>
        <div className="brand">
          <div className="brand-mark">{(form.siteName || "青").slice(0, 1)}</div>
          <div>
            <h1>{form.siteName || "新社区"}</h1>
            <p>{form.tagline || "从空楼开始"}</p>
          </div>
        </div>
        <h2>安装全新社区</h2>
        <p className="hint">只创建站长和版块骨架，没有演示帖和演示号。</p>
        <div className="stack">
          <label className="field-lab">
            社区名称
            <input className="field" value={form.siteName} onChange={(e) => set("siteName", e.target.value)} maxLength={20} placeholder="给这座楼起个名字" />
          </label>
          <label className="field-lab">
            一句话介绍
            <input className="field" value={form.tagline} onChange={(e) => set("tagline", e.target.value)} maxLength={40} placeholder="出现在顶栏和登录页" />
          </label>
          <label className="field-lab">
            站长账号
            <input className="field" value={form.username} onChange={(e) => set("username", e.target.value)} placeholder="字母数字 3-16 位" autoComplete="username" />
          </label>
          <label className="field-lab">
            站长昵称
            <input className="field" value={form.nickname} onChange={(e) => set("nickname", e.target.value)} maxLength={16} placeholder="楼里怎么称呼你" />
          </label>
          <label className="field-lab">
            站长密码
            <input className="field" type="password" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="至少 6 位" autoComplete="new-password" />
          </label>
          <button className="btn btn-gourd auth-go" type="submit" disabled={busy}>{busy ? "正在安装..." : "点亮这座楼"}</button>
        </div>
      </form>
    </div>
  );
}
