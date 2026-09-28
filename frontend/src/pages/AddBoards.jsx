import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, formatHeat } from "../api.js";
import { useAuth } from "../context.jsx";
import BoardIcon from "../components/BoardIcon.jsx";

const CATS = ["角色扮演", "竞速射击", "策略经营", "端游", "生活综合", "玩机一族", "其他游戏", "泳池"];

export default function AddBoards() {
  const { user, toast } = useAuth();
  const nav = useNavigate();
  const [boards, setBoards] = useState([]);
  const [cat, setCat] = useState("角色扮演");
  const [busy, setBusy] = useState(null);

  async function load() {
    const d = await api("/api/boards");
    setBoards(d.boards || []);
  }

  useEffect(() => {
    load().catch(() => {});
  }, [user]);

  async function follow(b) {
    if (!user) {
      nav("/login");
      return;
    }
    setBusy(b.id);
    try {
      await api(`/api/boards/${b.id}/follow`, { method: "POST" });
      await load();
    } catch (e) {
      toast(e.message);
    } finally {
      setBusy(null);
    }
  }

  const list = boards.filter((b) => !b.system && b.category === cat);

  return (
    <div className="layout single">
      <div className="hx-add">
        <div className="hx-cats">
          {CATS.map((c) => (
            <button key={c} type="button" className={`hx-cat ${cat === c ? "on" : ""}`} onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
        </div>
        <div className="hx-add-list">
          {list.map((b) => (
            <div className="hx-add-item" key={b.id}>
              <Link to={`/board/${b.id}`} className="hx-add-ico">
                <BoardIcon slug={b.slug} color={b.color} name={b.name} size={56} />
              </Link>
              <Link className="grow" to={`/board/${b.id}`}>
                <b>{b.name}</b>
                <div className="sub">热度:{formatHeat(b.heat)} 话题:{formatHeat(b.topics)}</div>
              </Link>
              <button
                type="button"
                className={`btn-follow ${b.followed ? "off" : ""}`}
                disabled={busy === b.id}
                onClick={() => follow(b)}
              >
                {b.followed ? "取消" : "关注"}
              </button>
            </div>
          ))}
          {list.length === 0 ? <div className="empty">这个分类还没有版块</div> : null}
        </div>
      </div>
    </div>
  );
}
