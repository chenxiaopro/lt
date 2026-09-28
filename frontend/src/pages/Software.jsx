import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context.jsx";
import { PostRow } from "../components/PostCard.jsx";
import Lightbox from "../components/Lightbox.jsx";

function SoftList() {
  const [tab, setTab] = useState("全部");
  const [list, setList] = useState([]);
  useEffect(() => {
    api("/api/softwares").then((d) => setList(d.softwares || [])).catch(() => {});
  }, []);
  const cats = ["全部", ...Array.from(new Set(list.map((s) => s.category).filter(Boolean)))];
  const shown = tab === "全部" ? list : list.filter((s) => s.category === tab);
  return (
    <div className="layout single">
      <div className="soft-page">
        <div className="soft-hero">
          <h2>三楼软件库</h2>
          <p>工具、美化、播放器，帖子里可直接引用。</p>
          <Link className="btn btn-gourd" to="/publish?type=software">投稿软件</Link>
        </div>
        <div className="chips">
          {cats.map((c) => (
            <button key={c} type="button" className={`chip ${tab === c ? "on" : ""}`} onClick={() => setTab(c)}>{c}</button>
          ))}
        </div>
        {shown.map((s) => (
          <Link className="soft-row" key={s.id} to={`/soft/${s.id}`}>
            <img src={s.icon} alt="" />
            <div className="grow">
              <b>{s.name}</b>
              <span>{s.summary}</span>
              <em>{s.version} · {s.size} · {s.downloads} 次获取</em>
            </div>
            <span className="soft-get">获取</span>
          </Link>
        ))}
        {shown.length === 0 ? <div className="empty">软件库还空着</div> : null}
      </div>
    </div>
  );
}

function SoftDetail({ id }) {
  const { user, toast } = useAuth();
  const nav = useNavigate();
  const [item, setItem] = useState(null);
  const [posts, setPosts] = useState([]);
  const [shot, setShot] = useState(-1);

  useEffect(() => {
    api(`/api/softwares/${id}`).then((d) => {
      setItem(d.software);
      setPosts(d.posts || []);
    }).catch((e) => toast(e.message));
  }, [id]);

  async function grab() {
    if (!item) return;
    try {
      const d = await api(`/api/softwares/${item.id}/download`, { method: "POST" });
      setItem(d.software);
      if (d.software.link) window.open(d.software.link, "_blank", "noopener");
      else toast("作者还没填下载地址");
    } catch (e) {
      toast(e.message);
    }
  }

  if (!item) return <div className="empty">软件打开中...</div>;
  const shots = item.images || [];

  return (
    <div className="layout single">
      <div className="soft-page">
        <div className="soft-head">
          <img src={item.icon} alt="" />
          <div className="grow">
            <h2>{item.name}</h2>
            <p>{item.version} · {item.size} · {item.category}</p>
            <p className="hint">{item.downloads} 次获取</p>
          </div>
          <button type="button" className="btn btn-gourd" onClick={grab}>获取</button>
        </div>
        {shots.length ? (
          <div className="soft-shots">
            {shots.map((src, i) => (
              <button type="button" key={src} onClick={() => setShot(i)}>
                <img src={src} alt="" />
              </button>
            ))}
          </div>
        ) : null}
        <div className="card tight">
          <h4 className="disc-h">介绍</h4>
          <p className="soft-intro">{item.content || item.summary}</p>
          {user ? <Link className="pill" to={`/publish?soft=${item.id}`}>写帖引用</Link> : null}
          <button type="button" className="pill" onClick={() => nav(`/post/${item.postId}`)} disabled={!item.postId}>相关主帖</button>
        </div>
        {posts.length ? (
          <div className="card tight">
            <h4 className="disc-h">相关帖子</h4>
            {posts.map((p) => <PostRow key={p.id} post={p} />)}
          </div>
        ) : null}
      </div>
      <Lightbox images={shots} index={shot} onClose={() => setShot(-1)} onIndex={setShot} />
    </div>
  );
}

export default function Software() {
  const { id } = useParams();
  return id ? <SoftDetail id={id} /> : <SoftList />;
}
