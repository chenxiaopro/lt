import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context.jsx";

export default function Status() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [health, setHealth] = useState(null);
  const [rows, setRows] = useState([]);
  const [running, setRunning] = useState(false);

  async function run() {
    setRunning(true);
    try {
      const h = await api("/api/admin/health");
      setHealth(h);
      const out = [];
      for (const f of h.features || []) {
        if (f.write) {
          out.push({ id: f.id, name: f.name, method: f.method, path: f.path, status: "map", detail: `参数 ${ (f.params || []).join(", ") || "无" }` });
          continue;
        }
        if (f.auth && !localStorage.getItem("qh_token")) {
          out.push({ id: f.id, name: f.name, method: f.method, path: f.sample || f.path, status: "auth", detail: "需登录后探测" });
          continue;
        }
        try {
          const d = await api(f.sample || f.path);
          const missing = (f.returns || []).filter((k) => !(k in d));
          out.push({
            id: f.id,
            name: f.name,
            method: f.method,
            path: f.sample || f.path,
            status: missing.length ? "warn" : "ok",
            detail: missing.length ? `缺字段 ${missing.join(", ")}` : `返回 ${(f.returns || []).join(", ") || "ok"}`
          });
        } catch (e) {
          out.push({ id: f.id, name: f.name, method: f.method, path: f.sample || f.path, status: "fail", detail: e.message });
        }
      }
      setRows(out);
    } catch (e) {
      setHealth({ ok: false, error: e.message });
      setRows([]);
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => {
    if (!user || !user.isAdmin) {
      nav("/me");
      return;
    }
    run();
  }, [user]);

  const checks = health && health.checks ? health.checks : {};

  return (
    <div className="layout single">
      <div className="card status-page">
        <div className="row-between">
          <h2 style={{ margin: 0, fontSize: 18 }}>服务器配置检查</h2>
          <button className="btn btn-fill" type="button" onClick={run} disabled={running}>{running ? "检查中" : "重新检查"}</button>
        </div>
        {health ? (
          <div className="status-grid">
            <div className={`status-pill ${health.ok ? "ok" : "fail"}`}>{health.ok ? "服务正常" : "服务异常"}</div>
              <p className="hint">节点 {health.node || "-"} · 运行 {health.uptime || 0}s</p>
            <ul className="status-checks">
              <li className={checks.database && checks.database.ok ? "ok" : "fail"}>
                数据库 {checks.database && checks.database.ok ? `用户 ${checks.database.users} / 版块 ${checks.database.boards} / 帖子 ${checks.database.posts}` : (checks.database && checks.database.error) || "未连通"}
              </li>
              <li className={checks.uploads && checks.uploads.ok ? "ok" : "fail"}>
                上传目录 {checks.uploads && checks.uploads.writable ? "可写" : "不可写"}
              </li>
              <li className={checks.jwt && checks.jwt.ok ? "ok" : "fail"}>
                JWT {checks.jwt && checks.jwt.ok ? "已配置" : "异常"}
              </li>
            </ul>
          </div>
        ) : (
          <div className="empty soft">正在探测接口</div>
        )}
        <div className="status-table">
          {rows.map((r) => (
            <div className={`status-row ${r.status}`} key={r.id}>
              <b>{r.name}</b>
              <code>{r.method} {r.path}</code>
              <span>{r.detail}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
