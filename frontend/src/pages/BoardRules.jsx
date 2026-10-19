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
  const [notice, setNotice] = useState("");
  const [noticeEdit, setNoticeEdit] = useState(false);
  const [types, setTypes] = useState("");
  const [typesEdit, setTypesEdit] = useState(false);

  useEffect(() => {
    api(`/api/boards/${id}`).then((d) => {
      setBoard(d.board);
      setRules(d.board.rules || "");
      setNotice(d.board.announcement || "");
      setTypes((d.board.threadTypes || []).map((t) => t.name).join(","));
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

  async function saveNotice() {
    try {
      const d = await api(`/api/boards/${id}/announcement`, { method: "PUT", body: { announcement: notice } });
      setNotice(d.announcement || "");
      setBoard((b) => ({ ...b, announcement: d.announcement || "" }));
      setNoticeEdit(false);
      toast(d.announcement ? "公告已保存" : "公告已清空");
    } catch (e) {
      toast(e.message);
    }
  }

  async function saveTypes() {
    try {
      const d = await api(`/api/boards/${id}/types`, { method: "PUT", body: { types } });
      setBoard((b) => ({ ...b, threadTypes: d.threadTypes || [] }));
      setTypes((d.threadTypes || []).map((t) => t.name).join(","));
      setTypesEdit(false);
      toast("主题分类已保存");
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
        <section className="rules-sec">
          <h3>版块公告</h3>
          {noticeEdit ? (
            <>
              <textarea className="rules-edit" value={notice} onChange={(e) => setNotice(e.target.value)} rows={4} maxLength={500} placeholder="写给来访者的短通知，可留空" />
              <div className="admin-appoint-row rules-actions">
                <button className="btn btn-fill" type="button" onClick={saveNotice}>保存公告</button>
                <button className="btn" type="button" onClick={() => { setNotice(board.announcement || ""); setNoticeEdit(false); }}>取消</button>
              </div>
            </>
          ) : (
            <p className="board-notice-body">{board.announcement || "暂无公告。"}</p>
          )}
          {canEdit && !noticeEdit ? (
            <button className="btn rules-edit-btn" type="button" onClick={() => setNoticeEdit(true)}>编辑公告</button>
          ) : null}
        </section>
        <section className="rules-sec">
          <h3>主题分类</h3>
          {typesEdit ? (
            <>
              <textarea className="rules-edit" value={types} onChange={(e) => setTypes(e.target.value)} rows={3} placeholder="逗号分隔，每个最多 8 字，最多 12 个" />
              <div className="admin-appoint-row rules-actions">
                <button className="btn btn-fill" type="button" onClick={saveTypes}>保存分类</button>
                <button className="btn" type="button" onClick={() => { setTypes((board.threadTypes || []).map((t) => t.name).join(",")); setTypesEdit(false); }}>取消</button>
              </div>
            </>
          ) : (
            <div className="type-bar">
              {(board.threadTypes || []).length
                ? board.threadTypes.map((t) => <span key={t.id} className="type-tag">{t.name}</span>)
                : <p className="hint">暂未设置分类。</p>}
            </div>
          )}
          {canEdit && !typesEdit ? (
            <button className="btn rules-edit-btn" type="button" onClick={() => setTypesEdit(true)}>编辑分类</button>
          ) : null}
        </section>
      </div>
    </div>
  );
}
