import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context.jsx";

export default function Auth({ mode }) {
  const { login, toast, site } = useAuth();
  const nav = useNavigate();
  const isReg = mode === "register";
  const isForgot = mode === "forgot";
  const isReset = mode === "reset";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [captcha, setCaptcha] = useState({ id: "", question: "" });
  const [answer, setAnswer] = useState("");
  const [token, setToken] = useState("");
  const [shown, setShown] = useState("");

  async function loadCaptcha() {
    try {
      const d = await api("/api/captcha");
      setCaptcha({ id: d.id, question: d.question });
      setAnswer("");
    } catch (err) {
      toast(err.message);
    }
  }

  useEffect(() => {
    if (isForgot || isReset) return undefined;
    loadCaptcha();
    return undefined;
  }, [mode]);

  async function submit(e) {
    e.preventDefault();
    try {
      if (isForgot) {
        const d = await api("/api/auth/forgot", { method: "POST", body: { username } });
        setShown(d.token);
        toast("凭证 20 分钟内有效");
        return;
      }
      if (isReset) {
        await api("/api/auth/reset", { method: "POST", body: { username, token, password } });
        toast("密码已更新，请登录");
        nav("/login");
        return;
      }
      const d = await api(isReg ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        body: { username, password, nickname, captchaId: captcha.id, captchaAnswer: answer }
      });
      login(d.token, d.user);
      toast(isReg ? "欢迎搬进三楼" : "欢迎回来");
      nav("/");
    } catch (err) {
      toast(err.message);
      if (!isForgot && !isReset) loadCaptcha();
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
        <h2>{isForgot ? "找回密码" : isReset ? "设置新密码" : isReg ? "注册一个葫芦号" : "回到三楼"}</h2>
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
          {isReset ? (
            <label className="field-lab">
              重置凭证
              <input className="field" value={token} onChange={(e) => setToken(e.target.value)} placeholder="登录页申请到的凭证" />
            </label>
          ) : null}
          {isForgot ? null : (
            <label className="field-lab">
              密码
              <input className="field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少 6 位" autoComplete={isReg || isReset ? "new-password" : "current-password"} />
            </label>
          )}
          {isForgot || isReset ? null : (
            <label className="field-lab">
              验证 {captcha.question || "..."}
              <input className="field" value={answer} onChange={(e) => setAnswer(e.target.value)} inputMode="numeric" placeholder="答案" />
            </label>
          )}
          {shown ? <p className="hint">重置凭证：{shown}，去设置新密码页填写</p> : null}
          <button className="btn btn-gourd auth-go" type="submit">{isForgot ? "申请凭证" : isReset ? "更新密码" : isReg ? "注册并进入" : "登录"}</button>
        </div>
        {isForgot ? <Link className="auth-switch" to="/reset">已有凭证，去设置新密码</Link> : null}
        {isReset ? <Link className="auth-switch" to="/login">回到登录</Link> : null}
        {isReg ? <Link className="auth-switch" to="/login">已有账号，去登录</Link> : null}
        {!isReg && !isForgot && !isReset ? (
          <>
            <Link className="auth-switch" to="/register">没有账号，去注册</Link>
            <Link className="auth-switch" to="/forgot">忘记密码</Link>
          </>
        ) : null}
      </form>
    </div>
  );
}
