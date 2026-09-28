import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context.jsx";

export default function Auth({ mode }) {
  const { login, toast, site } = useAuth();
  const nav = useNavigate();
  const isReg = mode === "register";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");

  async function submit(e) {
    e.preventDefault();
    try {
      const d = await api(isReg ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        body: { username, password, nickname }
      });
      login(d.token, d.user);
      toast(isReg ? "欢迎搬进三楼" : "欢迎回来");
      nav("/");
    } catch (err) {
      toast(err.message);
    }
  }

  return (
    <div className="hero-auth lucky-auth">
      <form className="auth-card" onSubmit={submit}>
        <div className="brand">
          <div className="brand-mark">{((site && site.name) || "青").slice(0, 1)}</div>
          <div>
            <h1>{(site && site.name) || "青葫三楼"}</h1>
            <p>{(site && site.tagline) || "幸运、趣事尽在青葫社区"}</p>
          </div>
        </div>
        <h2>{isReg ? "注册一个葫芦号" : "回到三楼"}</h2>
        <div className="stack">
          <label className="field-lab">
            账号
            <input className="field" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="字母数字 3-16 位" autoComplete="username" />
          </label>
          {isReg ? (
            <label className="field-lab">
              昵称
              <input className="field" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="三楼里怎么称呼你" />
            </label>
          ) : null}
          <label className="field-lab">
            密码
            <input className="field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少 6 位" autoComplete={isReg ? "new-password" : "current-password"} />
          </label>
          <button className="btn btn-gourd auth-go" type="submit">{isReg ? "注册并进入" : "登录"}</button>
        </div>
        {isReg ? <Link className="auth-switch" to="/login">已有账号，去登录</Link> : <Link className="auth-switch" to="/register">没有账号，去注册</Link>}
      </form>
    </div>
  );
}
