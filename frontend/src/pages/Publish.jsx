import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, compressImage, uploadVideo } from "../api.js";
import { useAuth } from "../context.jsx";

export default function Publish() {
  const { user, site, toast } = useAuth();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [boards, setBoards] = useState([]);
  const [boardId, setBoardId] = useState(sp.get("board") || "");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoPct, setVideoPct] = useState(0);
  const [link, setLink] = useState("");
  const [version, setVersion] = useState("");
  const [tracks, setTracks] = useState([]);
  const [trackId, setTrackId] = useState(sp.get("track") || "");
  const [softId, setSoftId] = useState(sp.get("soft") || "");
  const [size, setSize] = useState("");
  const [category, setCategory] = useState("工具");
  const [songQ, setSongQ] = useState("");
  const [songHits, setSongHits] = useState([]);
  const [songBusy, setSongBusy] = useState(false);
  const [friends, setFriends] = useState([]);
  const [picked, setPicked] = useState([]);
  const [atOn, setAtOn] = useState(false);
  const type = sp.get("type") || "post";
  const TYPE_META = {
    moment: { heading: "发动态", slug: "pool", titlePh: "这一刻想说的（可空）", bodyPh: "配图、心情、随手记。", needTitle: false, tag: "动态" },
    goods: { heading: "发商品", slug: "share", titlePh: "商品标题", bodyPh: "成色、价格、交易方式写清楚。", needTitle: true, tag: "商品" },
    software: { heading: "发软件", slug: "android", titlePh: "软件名称", bodyPh: "版本、用途、安装注意。", needTitle: true, tag: "软件" },
    post: { heading: "发到三楼", slug: null, titlePh: "标题写清楚，后来人才能搜到", bodyPh: "正文。攻略配步骤，求助配机型和已试过的方法。", needTitle: true, tag: "" }
  };
  const meta = TYPE_META[type] || TYPE_META.post;
  const [kind, setKind] = useState("normal");
  const [pollOpts, setPollOpts] = useState(["", ""]);
  const [pollMulti, setPollMulti] = useState(false);
  const [rewardAmt, setRewardAmt] = useState(10);
  const [packet, setPacket] = useState({ amount: 20, count: 5, blessing: "" });
  const [paid, setPaid] = useState({ price: 5, text: "" });
  const [act, setAct] = useState({ place: "", startAt: "", endAt: "", maxNum: 20, fee: 0 });
  const [captcha, setCaptcha] = useState({ id: "", question: "" });
  const [answer, setAnswer] = useState("");
  const [draftTip, setDraftTip] = useState("");
  const draftKey = user ? `qh_draft_${user.id}_${type}` : "";
  const [hideOn, setHideOn] = useState(false);
  const [hideText, setHideText] = useState("");
  const [typeId, setTypeId] = useState("0");

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
    if (!user) nav("/login");
  }, [user]);

  useEffect(() => {
    if (!user) return;
    api("/api/friends/mutual").then((d) => setFriends(d.users || [])).catch(() => setFriends([]));
  }, [user]);

  useEffect(() => {
    api("/api/boards").then((d) => {
      const list = d.boards || [];
      setBoards(list);
      if (!sp.get("board") && meta.slug) {
        const hit = list.find((b) => b.slug === meta.slug);
        if (hit) setBoardId(String(hit.id));
      }
    }).catch(() => {});
  }, [type]);

  useEffect(() => {
    setTypeId("0");
  }, [boardId]);

  useEffect(() => {
    api("/api/tracks").then((d) => setTracks(d.tracks || [])).catch(() => {});
    const sid = sp.get("soft");
    if (!sid) return;
    api(`/api/softwares/${sid}`).then((d) => {
      const s = d.software;
      if (!s) return;
      setSoftId(String(s.id));
      setTitle((t) => t || s.name);
      setVersion((v) => v || s.version || "");
      setLink((l) => l || s.link || "");
      setContent((c) => c || s.summary || "");
      setCategory(s.category || "工具");
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    loadCaptcha();
  }, [user]);

  useEffect(() => {
    if (!draftKey) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const d = JSON.parse(raw);
      setBoardId((v) => v || d.boardId || "");
      setTitle((v) => v || d.title || "");
      setContent((v) => v || d.content || "");
      setTags((v) => v || d.tags || "");
      setImages((v) => (v && v.length ? v : d.images || []));
      setVideos((v) => (v && v.length ? v : d.videos || []));
      setKind(d.kind || "normal");
      setPollOpts(d.pollOpts || ["", ""]);
      setPollMulti(!!d.pollMulti);
      setRewardAmt(d.rewardAmt || 10);
      setPacket(d.packet || { amount: 20, count: 5, blessing: "" });
      setPaid(d.paid || { price: 5, text: "" });
      setAct(d.act || { place: "", startAt: "", endAt: "", maxNum: 20, fee: 0 });
      setHideOn(!!d.hideOn);
      setHideText(d.hideText || "");
      setDraftTip("已恢复草稿");
    } catch {
      /* ignore */
    }
  }, [draftKey]);

  useEffect(() => {
    if (!draftKey) return undefined;
    const t = setTimeout(() => {
      localStorage.setItem(draftKey, JSON.stringify({
        boardId, title, content, tags, images, videos, kind, pollOpts, pollMulti, rewardAmt, packet, paid, act
        , hideOn, hideText
      }));
    }, 2000);
    return () => clearTimeout(t);
  }, [draftKey, boardId, title, content, tags, images, videos, kind, pollOpts, pollMulti, rewardAmt, packet, paid, act, hideOn, hideText]);

  async function onFiles(e) {
    const files = Array.from(e.target.files || []).slice(0, 9 - images.length);
    if (!files.length) return;
    try {
      const prepared = await Promise.all(files.map((f) => compressImage(f)));
      const fd = new FormData();
      prepared.forEach((f) => fd.append("files", f));
      const d = await api("/api/upload", { method: "POST", body: fd });
      setImages([...images, ...d.urls]);
    } catch (err) {
      toast(err.message);
    }
  }

  async function onVideos(e) {
    const files = Array.from(e.target.files || []).slice(0, 3 - videos.length);
    e.target.value = "";
    if (!files.length) return;
    const maxMb = site?.videoMaxMb || 80;
    const tooBig = files.find((f) => f.size > maxMb * 1024 * 1024);
    if (tooBig) {
      toast(`单个视频不能超过 ${maxMb}MB`);
      return;
    }
    setVideoBusy(true);
    setVideoPct(0);
    const total = files.reduce((n, f) => n + f.size, 0) || 1;
    let done = 0;
    try {
      for (const file of files) {
        const url = await uploadVideo(file, (pct) => {
          setVideoPct(Math.round(((done + (file.size * pct) / 100) / total) * 100));
        });
        done += file.size;
        setVideos((cur) => [...cur, url].slice(0, 3));
      }
      setVideoPct(100);
      toast("视频已上传");
    } catch (err) {
      toast(err.message);
    } finally {
      setVideoBusy(false);
    }
  }

  async function searchSongs() {
    const key = songQ.trim();
    if (!key) {
      toast("输入歌名");
      return;
    }
    setSongBusy(true);
    try {
      const d = await api(`/api/music/search?q=${encodeURIComponent(key)}`);
      setSongHits(d.songs || []);
      if (!(d.songs || []).length) toast("没有搜到可播放的歌");
    } catch (err) {
      toast(err.message);
    } finally {
      setSongBusy(false);
    }
  }

  async function pickSong(song) {
    if (!song.url) {
      toast("这首没有试听，换一首");
      return;
    }
    setSongBusy(true);
    try {
      const d = await api("/api/tracks/import", {
        method: "POST",
        body: {
          title: song.title,
          artist: song.artist,
          url: song.url,
          cover: song.cover,
          lyrics: song.lyrics || "",
          source: song.source,
          sourceId: song.sourceId
        }
      });
      const next = await api("/api/tracks");
      setTracks(next.tracks || []);
      if (d.track) setTrackId(String(d.track.id));
      setSongHits([]);
      toast(d.existed ? "已挂上曲库里的歌" : "已挂上");
    } catch (err) {
      toast(err.message);
    } finally {
      setSongBusy(false);
    }
  }

  function pickAt(u) {
    setPicked((list) => {
      if (list.some((x) => x.id === u.id)) return list.filter((x) => x.id !== u.id);
      return [...list, u];
    });
  }

  async function submit() {
    try {
      if (videoBusy) {
        toast("视频还在上传，完成后再发布");
        return;
      }
      const bid = Number(boardId);
      if (!bid) {
        toast("请选择版块");
        return;
      }
      const autoTitle = (title || content || meta.heading).trim().slice(0, 48);
      const body = content.trim() || (type === "software" && link ? "软件分享" : "");
      if (!body) {
        toast(type === "software" ? "请填写介绍或下载链接" : "请填写正文");
        return;
      }
      if (hideOn && !hideText.trim()) {
        toast("请填写隐藏内容");
        return;
      }
      const extra = meta.tag ? [meta.tag] : [];
      const d = await api("/api/posts", {
        method: "POST",
        body: {
          boardId: bid,
          title: autoTitle,
          content: body,
          images,
          videos,
          tags: [...extra, ...tags.split(/[,，\s]+/).filter(Boolean)].slice(0, 5),
          link: type === "software" && !softId ? link : "",
          version: type === "software" ? version : "",
          size: type === "software" ? size : "",
          category: type === "software" ? category : "",
          softId: Number(softId) || 0,
          trackId: Number(trackId) || 0,
          mentionIds: picked.map((u) => u.id),
          captchaId: captcha.id,
          captchaAnswer: answer,
          threadKind: kind,
          hideText: hideOn ? hideText.trim() : "",
          typeId: Number(typeId) || 0,
          thread: kind === "poll"
            ? { options: pollOpts, multi: pollMulti }
            : kind === "reward"
              ? { amount: rewardAmt }
              : kind === "redpacket"
                ? { amount: packet.amount, packets: packet.count, blessing: packet.blessing }
              : kind === "paid"
                ? { price: paid.price, text: paid.text }
              : kind === "activity"
                ? act
                : null
        }
      });
      if (draftKey) localStorage.removeItem(draftKey);
      toast("已发到三楼，经验 +12");
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      nav(type === "moment" ? "/?view=moment" : `/post/${d.post.id}`);
    } catch (e) {
      toast(e.message);
      loadCaptcha();
    }
  }

  return (
    <div className="layout single">
      <div className="card pub-card">
        <div className="stack">
          {draftTip ? (
            <div className="draft-bar">
              <span>{draftTip}</span>
              <button type="button" className="btn" onClick={() => {
                if (draftKey) localStorage.removeItem(draftKey);
                setTitle(""); setContent(""); setTags(""); setImages([]); setVideos([]);
                setKind("normal"); setPollOpts(["", ""]); setPacket({ amount: 20, count: 5, blessing: "" }); setPaid({ price: 5, text: "" }); setDraftTip("");
                setHideOn(false); setHideText("");
                toast("草稿已丢弃");
              }}>丢弃草稿</button>
            </div>
          ) : null}
          <label className="field-lab">
            发到版块
            <select className="select" value={boardId} onChange={(e) => setBoardId(e.target.value)}>
              <option value="">选择版块</option>
            {boards.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          </label>
          {((boards.find((b) => String(b.id) === String(boardId)) || {}).threadTypes || []).length ? (
            <label className="field-lab">
              主题分类
              <select className="select" value={typeId} onChange={(e) => setTypeId(e.target.value)}>
                <option value="0">不分类</option>
                {((boards.find((b) => String(b.id) === String(boardId)) || {}).threadTypes || []).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </label>
          ) : null}
          {type === "post" ? (
            <>
              <div className="kind-row">
                {[["normal", "普通"], ["poll", "投票"], ["reward", "悬赏"], ["activity", "活动"], ["redpacket", "红包"], ["paid", "付费"]].map(([k, lab]) => (
                  <button type="button" key={k} className={`kind-btn${kind === k ? " on" : ""}`} onClick={() => setKind(k)}>{lab}</button>
                ))}
              </div>
              {kind === "poll" ? (
                <div className="stack">
                  {pollOpts.map((opt, i) => (
                    <input key={i} className="field" value={opt} maxLength={40} placeholder={`选项 ${i + 1}`} onChange={(e) => setPollOpts((list) => list.map((x, n) => (n === i ? e.target.value : x)))} />
                  ))}
                  {pollOpts.length < 10 ? <button type="button" className="btn" onClick={() => setPollOpts((list) => [...list, ""])}>加选项</button> : null}
                  <label className="hint"><input type="checkbox" checked={pollMulti} onChange={(e) => setPollMulti(e.target.checked)} /> 允许多选</label>
                </div>
              ) : null}
              {kind === "reward" ? (
                <label className="field-lab">悬赏葫芦
                  <input className="field" type="number" min={1} max={999} value={rewardAmt} onChange={(e) => setRewardAmt(Number(e.target.value) || 1)} />
                </label>
              ) : null}
              {kind === "redpacket" ? (
                <>
                  <label className="field-lab">红包总额（葫芦）
                    <input className="field" type="number" min={1} max={999} value={packet.amount} onChange={(e) => setPacket({ ...packet, amount: Number(e.target.value) || 1 })} />
                  </label>
                  <label className="field-lab">红包个数
                    <input className="field" type="number" min={1} max={100} value={packet.count} onChange={(e) => setPacket({ ...packet, count: Number(e.target.value) || 1 })} />
                  </label>
                  <label className="field-lab">祝福语
                    <input className="field" maxLength={40} value={packet.blessing} onChange={(e) => setPacket({ ...packet, blessing: e.target.value })} placeholder="恭喜发财，大吉大利" />
                  </label>
                  <p className="hint">24 小时内领完为止，剩余葫芦到期自动退回。余额 {user?.gourd || 0} 葫芦。</p>
                </>
              ) : null}
              {kind === "paid" ? (
                <>
                  <label className="field-lab">解锁价格（葫芦）
                    <input className="field" type="number" min={1} max={999} value={paid.price} onChange={(e) => setPaid({ ...paid, price: Number(e.target.value) || 1 })} />
                  </label>
                  <label className="field-lab">付费内容（解锁后可见）
                    <textarea className="field" rows={6} maxLength={4000} value={paid.text} onChange={(e) => setPaid({ ...paid, text: e.target.value })} placeholder="写在这里的内容只有付费解锁后可见" />
                  </label>
                  <p className="hint">上方正文作为免费试读。读者支付葫芦后即可查看付费内容，收入直接进入你的余额。</p>
                </>
              ) : null}
              {kind === "activity" ? (
                <>
                  <label className="field-lab">地点<input className="field" value={act.place} maxLength={40} onChange={(e) => setAct({ ...act, place: e.target.value })} /></label>
                  <label className="field-lab">开始<input className="field" type="datetime-local" value={act.startAt} onChange={(e) => setAct({ ...act, startAt: e.target.value })} /></label>
                  <label className="field-lab">结束<input className="field" type="datetime-local" value={act.endAt} onChange={(e) => setAct({ ...act, endAt: e.target.value })} /></label>
                  <label className="field-lab">人数上限<input className="field" type="number" min={1} max={200} value={act.maxNum} onChange={(e) => setAct({ ...act, maxNum: Number(e.target.value) || 20 })} /></label>
                  <label className="field-lab">报名费葫芦<input className="field" type="number" min={0} max={999} value={act.fee} onChange={(e) => setAct({ ...act, fee: Number(e.target.value) || 0 })} /></label>
                </>
              ) : null}
            </>
          ) : null}
          {type === "post" ? (
            <>
              <label className="hint">
                <input type="checkbox" checked={hideOn} onChange={(e) => setHideOn(e.target.checked)} /> 隐藏内容需回复后可见
              </label>
              {hideOn ? (
                <label className="field-lab">隐藏段
                  <textarea className="field" rows={4} maxLength={2000} value={hideText} onChange={(e) => setHideText(e.target.value)} placeholder="回复本帖后才能看见这段" />
                </label>
              ) : null}
            </>
          ) : null}
          {type === "software" ? (
            <>
              {softId ? <p className="hint">引用软件库 #{softId}</p> : null}
              <label className="field-lab">
                版本
                <input className="field" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="例如 1.2.0" />
              </label>
              <label className="field-lab">
                体积
                <input className="field" value={size} onChange={(e) => setSize(e.target.value)} placeholder="例如 12 MB" />
              </label>
              <label className="field-lab">
                分类
                <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {["工具", "美化", "系统", "娱乐"].map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label className="field-lab">
                下载链接
                <input className="field" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https:// 或网盘链接" />
              </label>
            </>
          ) : null}
          <label className="field-lab">
            挂载音乐
            <div className="music-search pub-song-search">
              <input
                className="field"
                value={songQ}
                onChange={(e) => setSongQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); searchSongs(); } }}
                placeholder="搜歌名挂上"
              />
              <button className="btn btn-fill" type="button" disabled={songBusy} onClick={searchSongs}>
                {songBusy ? "搜..." : "搜索"}
              </button>
            </div>
            {songHits.length ? (
              <div className="pub-hits">
                {songHits.map((s) => (
                  <button
                    type="button"
                    className="pub-hit"
                    key={`${s.source}-${s.sourceId || s.title}`}
                    disabled={songBusy || !s.url}
                    onClick={() => pickSong(s)}
                  >
                    {s.cover ? <img src={s.cover} alt="" /> : <i>{s.title.slice(0, 1)}</i>}
                    <span className="grow">
                      <b>{s.title}</b>
                      <em>{s.artist}{s.url ? " · 可试听" : " · 无试听"}</em>
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
            <select className="select" value={trackId} onChange={(e) => setTrackId(e.target.value)}>
              <option value="">不挂音乐</option>
              {tracks.map((t) => <option key={t.id} value={t.id}>{t.title} · {t.artist}</option>)}
            </select>
          </label>
          <Link className="hint soft-link" to="/music?upload=1">没有想听的，去传一首</Link>
          {meta.needTitle !== false ? (
            <label className="field-lab">
              标题
              <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={meta.titlePh} maxLength={48} />
            </label>
          ) : (
            <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={meta.titlePh} maxLength={48} />
          )}
          <label className="field-lab">
            {kind === "paid" && type === "post" ? "免费试读" : "正文"}
            <textarea className="field pub-body" value={content} onChange={(e) => setContent(e.target.value)} placeholder={kind === "paid" && type === "post" ? "放一段介绍，让读者决定是否解锁。" : meta.bodyPh} />
          </label>
          <div className="pub-at">
            <button type="button" className="btn" onClick={() => {
              if (!friends.length) { toast("只能艾特互相关注的好友"); return; }
              setAtOn((v) => !v);
            }}>@ 艾特好友</button>
            {picked.length ? (
              <div className="pub-at-picked">
                {picked.map((u) => (
                  <button type="button" key={u.id} className="pub-at-chip" onClick={() => pickAt(u)}>@{u.nickname} ×</button>
                ))}
              </div>
            ) : null}
            {atOn ? (
              <div className="pub-at-list">
                {friends.map((u) => (
                  <button type="button" key={u.id} className={picked.some((x) => x.id === u.id) ? "on" : ""} onClick={() => pickAt(u)}>
                    <img src={u.avatar} alt="" />
                    <span>{u.nickname}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <label className="field-lab">
            标签
            <input className="field" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="空格或逗号分开" />
          </label>
          <div className="preview-row">
            {images.map((src) => <img key={src} src={src} alt="" />)}
            {videos.map((src) => (
              <span className="pub-video" key={src}>
                <video src={src} muted playsInline preload="metadata" />
                <button type="button" onClick={() => setVideos((cur) => cur.filter((x) => x !== src))} aria-label="移除视频">×</button>
              </span>
            ))}
            {images.length < 9 ? (
              <label className="upload">
                <span>+</span>
                <input type="file" accept="image/*" multiple hidden onChange={onFiles} />
              </label>
            ) : null}
            {videos.length < 3 ? (
              <label className={`upload video-upload${videoBusy ? " busy" : ""}`}>
                <span>{videoBusy ? `${videoPct}%` : "视频"}</span>
                <input type="file" accept="video/mp4,video/webm,video/quicktime,video/x-m4v" multiple hidden disabled={videoBusy} onChange={onVideos} />
              </label>
            ) : null}
          </div>
          {videoBusy ? (
            <div className="pub-upload-bar"><i style={{ width: `${videoPct}%` }} /></div>
          ) : null}
          <label className="field-lab">
            验证 {captcha.question || "..."}
            <input className="field" value={answer} onChange={(e) => setAnswer(e.target.value)} inputMode="numeric" placeholder="答案" />
          </label>
          <button className="btn btn-gourd auth-go" onClick={submit}>发布</button>
        </div>
      </div>
    </div>
  );
}
