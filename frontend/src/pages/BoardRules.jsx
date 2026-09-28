import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context.jsx";
import BoardIcon from "../components/BoardIcon.jsx";

export default function BoardRules() {
  const { id } = useParams();
  const { user, toast } = useAuth();
  const [board, setBoard] = useState(null);
  const [editing, setEditing] = useState(false);
  const [rules, setRules] = useState("");

  useEffect(() => {
    api(`/api/boards/${id}`).then((d) => {
      setBoard(d.board);
      setRules(d.board.rules || "");
    }).catch(() => {});
  }, [id]);

  if (!board) return <div className="empty">版规展开中...</div>;

  const canEdit = user && (user.isAdmin || (user.modBoardIds || []).includes(board.id));

  async function save() {
    try {
      const d = await api(`/api/boards/${id}/rules`, { method: "PUT", body: { rules } });
      setRules(d.rules || rules);
      setBoard((b) => ({ ...b, rules: d.rules || rules }));
      setEditing(false);
      toast("版规已保存");
    } catch (e) {
      toast(e.message);
    }
  }

  const mods = board.modUsers || [];

  return (
    <div className="layout single">
      <div className="rules-page">
        <div className="rules-head">
          <BoardIcon slug={board.slug} color={board.color} name={board.name} size={56} />
          <div>
            <h2>{board.name}</h2>
            <p>{board.desc || board.name}</p>
          </div>
        </div>
        <section className="rules-sec">
          <h3>版块介绍</h3>
          <p>{board.desc || "暂无介绍"}</p>
        </section>
        <section className="rules-sec">
          <h3>版主</h3>
          <div className="mod-row">
            {mods.length ? mods.map((m) => {
              const inner = (
                <>
                  {m.avatar ? <img src={m.avatar} alt="" /> : <i className="mod-ph">{(m.nickname || "?").slice(0, 1)}</i>}
                  <span>{m.nickname}</span>
                </>
              );
              return m.id ? (
                <Link className="mod-cell" key={m.nickname} to={`/user/${m.id}`}>{inner}</Link>
              ) : (
                <div className="mod-cell" key={m.nickname}>{inner}</div>
              );
            }) : <p className="hint">暂无版主</p>}
          </div>
        </section>
        <section className="rules-sec">
          <h3>版块规定</h3>
          {editing ? (
            <>
              <textarea className="rules-edit" value={rules} onChange={(e) => setRules(e.target.value)} rows={12} maxLength={4000} />
              <div className="admin-appoint-row rules-actions">
                <button className="btn btn-fill" type="button" onClick={save}>保存版规</button>
                <button className="btn" type="button" onClick={() => { setRules(board.rules || ""); setEditing(false); }}>取消</button>
              </div>
            </>
          ) : (
            <pre className="rules-body">{board.rules || "请文明发言，友善交流。"}</pre>
          )}
          {canEdit && !editing ? (
            <button className="btn rules-edit-btn" type="button" onClick={() => setEditing(true)}>编辑版规</button>
          ) : null}
        </section>
      </div>
    </div>
  );
}
