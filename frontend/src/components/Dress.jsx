import React, { useState } from "react";
import { Link } from "react-router-dom";

export { FrameArt, FrameShop, BubbleSkin, bubbleVars, bubbleClass, applySiteTheme } from "./DressArt.jsx";
import { FrameArt, FrameShop, BubbleSkin } from "./DressArt.jsx";

export function honorOf(user, boardId) {
  if (!user) return null;
  const now = Date.now();
  const list = (user.honors || []).filter((h) => h.title && (!h.expiresAt || Date.parse(h.expiresAt) > now));
  const byBoard = boardId ? list.find((h) => Number(h.boardId) === Number(boardId)) : null;
  const worn = list.find((h) => h.shown) || byBoard || list[0];
  if (worn && worn.title) return { title: worn.title, color: worn.color || "#38bdf8", boardName: worn.boardName || "" };
  if (user.isAdmin) return { title: "站务", color: "#ff2442" };
  return null;
}

export function HonorChips({ user, boardId, max = 1 }) {
  if (!user) return null;
  const now = Date.now();
  const list = (user.honors || []).filter((h) => h.title && (!h.expiresAt || Date.parse(h.expiresAt) > now));
  const prefer = boardId ? list.find((h) => Number(h.boardId) === Number(boardId)) : null;
  const ordered = prefer
    ? [prefer, ...list.filter((h) => Number(h.boardId) !== Number(prefer.boardId))]
    : [...list.filter((h) => h.shown), ...list.filter((h) => !h.shown)];
  const items = ordered.slice(0, max);
  if (!items.length) {
    const one = honorOf(user, boardId);
    if (!one) return null;
    return <span className="honor-chip" style={{ background: one.color }}>{one.title}</span>;
  }
  return (
    <span className="honor-row">
      {items.map((h) => (
        <span className="honor-chip" key={`${h.boardId}-${h.title}`} style={{ background: h.color || "#38bdf8" }} title={h.boardName || ""}>{h.title}</span>
      ))}
    </span>
  );
}

export function MedalRow({ medals, max = 5 }) {
  const list = (medals || []).slice(0, max);
  if (!list.length) return null;
  return (
    <span className="medal-row">
      {list.map((m) => (
        <i className="medal-dot" key={m.slug} style={{ background: m.color }} title={m.name}>{m.icon}</i>
      ))}
    </span>
  );
}

export function MedalWall({ medals, empty = "还没有勋章", onToggle }) {
  const list = medals || [];
  const [open, setOpen] = useState(null);
  if (!list.length) return <p className="hint">{empty}</p>;
  const cur = open ? list.find((m) => m.slug === open.slug) || open : null;
  return (
    <>
      <div className="medal-wall">
        {list.map((m) => (
          <button
            type="button"
            className={`medal-card${m.owned === false ? " dim" : ""}${m.equipped ? " on" : ""}`}
            key={m.slug}
            onClick={() => setOpen(m)}
          >
            <i className="medal-dot lg" style={{ background: m.color }}>{m.icon}</i>
            <b>{m.name}</b>
            <span>{m.desc}</span>
            {m.owned !== false ? <em>{m.equipped ? "展示中" : "已点亮"}</em> : <em>未点亮</em>}
          </button>
        ))}
      </div>
      {cur ? (
        <div className="modal-mask medal-detail" onClick={() => setOpen(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <i className="medal-dot xl" style={{ background: cur.color }}>{cur.icon}</i>
            <h3>{cur.name}</h3>
            <p>{cur.desc}</p>
            {cur.owned !== false && onToggle ? (
              <label className="medal-show">
                <input
                  type="checkbox"
                  checked={!!cur.equipped}
                  onChange={() => onToggle(cur)}
                />
                展示该勋章
              </label>
            ) : <p className="hint">尚未点亮</p>}
            <button type="button" className="btn" onClick={() => setOpen(null)}>关闭</button>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function VerifyBadge({ user }) {
  if (!user || !user.verifyKind) return null;
  const kind = user.verifyKind;
  const label = kind === "official" ? "官方" : "V";
  const title = user.verifyTitle || ({ person: "个人认证", org: "企业认证", official: "官方认证" }[kind] || "认证");
  return <i className={`v-badge ${kind}`} title={title}>{label}</i>;
}

export function FloorWho({ user, boardId, link, muted }) {
  if (!user) return null;
  const name = link && user.id ? <Link to={`/user/${user.id}`}>{user.nickname}</Link> : <span>{user.nickname}</span>;
  const sex = user.gender === "男" || user.gender === "女" ? user.gender : "";
  return (
    <div className={`floor-who${muted ? " muted" : ""}`}>
      <div className="floor-who-top">
        <span className={`floor-nick${user.vip ? (user.vipTier === "svip" ? " is-svip" : " is-vip") : ""}`}>{name}</span>
        <VerifyBadge user={user} />
        <MedalRow medals={user.medals} />
        {sex ? <i className={`medal-dot sex ${sex === "女" ? "f" : "m"}`} title={sex}>{sex}</i> : null}
      </div>
      <div className="floor-who-sub">
        <LevelMark user={user} />
        <HonorChips user={user} boardId={boardId} />
      </div>
    </div>
  );
}

export function WhoMeta({ user }) {
  if (!user) return null;
  const bits = [];
  if (user.vip) bits.push(user.vipLabel || (user.vipTier === "svip" ? "SVIP" : "VIP"));
  if (user.gender && user.gender !== "保密") bits.push(user.gender);
  if (user.age) bits.push(`${user.age}岁`);
  if (user.city) bits.push(user.city);
  if (user.ipRegion) bits.push(`属地 ${user.ipRegion}`);
  if (user.isAdmin) bits.push("站务");
  else if ((user.modBoardIds && user.modBoardIds.length) || user.isModerator) bits.push("版主");
  if (!bits.length) return null;
  return <p className="who-meta">{bits.join(" · ")}</p>;
}

export function vipDaysLeft(user) {
  if (!user || !user.vip || !user.vipUntil) return 0;
  return Math.max(1, Math.ceil((new Date(user.vipUntil).getTime() - Date.now()) / 86400000));
}

export function vipLabelOf(user) {
  if (!user || !user.vip) return "";
  if (user.vipLabel) return user.vipLabel;
  const n = Math.max(1, Math.min(9, Number(user.vipLevel) || 1));
  return `${user.vipTier === "svip" ? "SVIP" : "VIP"}${n}`;
}

export function vipClassOf(user) {
  if (!user || !user.vip) return "";
  return user.vipTier === "svip" ? "is-svip" : "is-vip";
}

export function VipCrowns({ user }) {
  if (!user || !user.vip) return null;
  const n = Math.min(4, Math.max(1, Number(user.vipLevel) || 1));
  return (
    <div className={`vip-crowns ${user.vipTier === "svip" ? "svip" : "vip"}`} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => <i key={i} />)}
    </div>
  );
}

export function UinLine({ user }) {
  if (!user || !user.uin) return null;
  return (
    <p className={`uin-line${user.uinPretty ? " pretty" : ""}`}>
      {user.uinPretty ? (
        <span className="pretty-uin-pill"><em>靓</em>{user.uin}</span>
      ) : (
        <span>青葫号 {user.uin}</span>
      )}
      {user.vip ? <i className={`vip-chip ${user.vipTier === "svip" ? "svip" : "vip"}`}>{vipLabelOf(user)}</i> : null}
    </p>
  );
}

export function Level({ user }) {
  if (!user) return null;
  const color = user.titleColor || (user.level >= 15 ? "#ff2442" : user.level >= 8 ? "#d97706" : "#16a34a");
  return (
    <span className="lv-pack">
      <i className="level" style={{ color, background: `${color}22` }}>Lv.{user.level}</i>
      <i className="title-chip" style={{ color, background: `${color}14` }}>{user.title}</i>
    </span>
  );
}

export function LevelMark({ user }) {
  if (!user) return null;
  const color = user.titleColor || "#16a34a";
  return <i className="level compact" style={{ color, background: `${color}22` }}>lv{user.level}</i>;
}

export function LevelProgress({ user, compact }) {
  if (!user) return null;
  const remain = Math.max(0, (user.nextExp || 0) - (user.exp || 0));
  const color = user.titleColor || "#16a34a";
  const pct = Math.max(0, Math.min(100, Number(user.progress) || 0));
  return (
    <Link className={`lv-board${compact ? " compact" : ""}`} to="/level">
      {compact ? (
        <div className="xp-rail">
          <i className="xp-lv" style={{ color, background: `${color}1f` }}>LV {user.level}</i>
          <div className="xp-track" style={{ "--xp": color }} aria-label="经验进度">
            <i className="xp-fill" style={{ width: `${pct}%` }} />
          </div>
          <em className="xp-pct">{user.maxLevel ? "满级" : `${Math.round(pct)}%`}</em>
        </div>
      ) : (
        <>
          <div className="lv-board-top">
            <Level user={user} />
            <span className="lv-gourd">葫芦 {user.gourd}</span>
          </div>
          <div className="xp-track" style={{ "--xp": color }} aria-label="经验进度">
            <i className="xp-fill" style={{ width: `${pct}%` }} />
          </div>
        </>
      )}
      <p className="lv-exp">
        {user.maxLevel
          ? `经验 ${Number(user.exp || 0).toLocaleString()} · ${user.title}`
          : `${Number(user.exp || 0).toLocaleString()} / ${Number(user.nextExp || 0).toLocaleString()} · 距 ${user.nextTitle} 还差 ${remain.toLocaleString()}`}
      </p>
    </Link>
  );
}

export function cardVars(card) {
  if (!card) return undefined;
  return {
    "--card-a": card.color || "#ff2442",
    "--card-b": card.color2 || "#fbbf24",
    "--card-bg": card.bg || card.color || "#fff1f2",
    "--card-ink": card.ink || "#881337"
  };
}

export function UserAvatar({ user, size = "sm", plain = false, square = false }) {
  if (!user) return null;
  const frame = plain ? null : (user.dress && (user.dress.frame || user.dress.pendant));
  const slug = frame && frame.slug;
  const styleName = frame && frame.style;
  const color = frame && frame.color;
  const color2 = frame && frame.color2;
  const style = color ? { "--frame-a": color, "--frame-b": color2 || color } : undefined;
  return (
    <span className={`u-avatar ${size}${square ? " sq" : ""}${frame ? " has-frame" : ""}${slug ? ` fr-${slug}` : ""}${styleName ? ` st-${styleName}` : ""}`} style={style}>
      <img src={user.avatar} alt="" />
      {styleName ? <FrameArt style={styleName} color={color} color2={color2} mark={frame && frame.mark} /> : null}
    </span>
  );
}

export function UserName({ user, withLevel = true, compactLevel = false }) {
  if (!user) return null;
  return (
    <span className={`u-name ${vipClassOf(user)}`.trim()}>
      {user.nickname}
      <VerifyBadge user={user} />
      {user.vip ? <i className={`vip-chip ${user.vipTier === "svip" ? "svip" : "vip"}`}>{vipLabelOf(user)}</i> : null}
      {user.uinPretty ? <i className="pretty-mark">靓</i> : null}
      {withLevel ? (compactLevel ? <LevelMark user={user} /> : <Level user={user} />) : null}
    </span>
  );
}

export function DressPreview({ gift, face }) {
  const fake = {
    avatar: face || "https://api.dicebear.com/7.x/adventurer/svg?seed=qinghu&backgroundColor=fff6ec",
    nickname: "青葫",
    level: 8,
    title: "金葫芦",
    titleColor: "#d97706",
    dress: {
      [gift.kind]: { id: gift.id, slug: gift.slug, name: gift.name, ...(gift.payload || {}), mark: (gift.payload && gift.payload.mark) || gift.name }
    }
  };
  if (gift.kind === "pendant" || gift.kind === "frame") {
    if (face) return <UserAvatar user={fake} size="lg" />;
    return <FrameShop gift={gift} />;
  }
  if (gift.kind === "bubble") {
    const payload = { slug: gift.slug, ...(gift.payload || {}) };
    return <BubbleSkin bubble={payload} className="dress-bub">你好呀</BubbleSkin>;
  }
  if (gift.kind === "card") {
    const p = gift.payload || {};
    return (
      <div className={`dress-card-mini st-${p.style || "wash"}`} style={cardVars(p)}>
        <i />
        <b>{gift.name || "主页"}</b>
      </div>
    );
  }
  return <UserAvatar user={fake} size="lg" />;
}
