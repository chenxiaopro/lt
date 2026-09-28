import React from "react";
import { Link } from "react-router-dom";

export function honorOf(user, boardId) {
  if (!user) return null;
  const hit = (user.honors || []).find((h) => Number(h.boardId) === Number(boardId));
  if (hit && hit.title) return { title: hit.title, color: hit.color || "#38bdf8" };
  if (user.isAdmin) return { title: "站务", color: "#ff2442" };
  const wear = user.dress && user.dress.title;
  if (wear) return { title: wear.mark || wear.name, color: "#111827" };
  return null;
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
  if (!list.length) return <p className="hint">{empty}</p>;
  return (
    <div className="medal-wall">
      {list.map((m) => (
        <button
          type="button"
          className={`medal-card${m.owned === false ? " dim" : ""}${m.equipped ? " on" : ""}`}
          key={m.slug}
          disabled={m.owned === false || !onToggle}
          onClick={() => onToggle && onToggle(m)}
        >
          <i className="medal-dot lg" style={{ background: m.color }}>{m.icon}</i>
          <b>{m.name}</b>
          <span>{m.desc}</span>
          {m.owned !== false && onToggle ? <em>{m.equipped ? "佩戴中" : "点按佩戴"}</em> : null}
        </button>
      ))}
    </div>
  );
}

export function FloorWho({ user, boardId, link, muted }) {
  if (!user) return null;
  const honor = honorOf(user, boardId);
  const name = link && user.id ? <Link to={`/user/${user.id}`}>{user.nickname}</Link> : <span>{user.nickname}</span>;
  return (
    <div className={`floor-who${muted ? " muted" : ""}`}>
      <div className="floor-who-top">
        <span className="floor-nick">{name}</span>
        <MedalRow medals={user.medals} />
        {user.dress && user.dress.badge ? <i className={`u-badge b-${user.dress.badge.slug}`}>{user.dress.badge.mark || user.dress.badge.name}</i> : null}
      </div>
      <div className="floor-who-sub">
        <LevelMark user={user} />
        {honor ? <span className="honor-chip" style={{ background: honor.color }}>{honor.title}</span> : null}
      </div>
    </div>
  );
}

export function WhoMeta({ user }) {
  if (!user) return null;
  const bits = [];
  if (user.gender && user.gender !== "保密") bits.push(user.gender);
  if (user.age) bits.push(`${user.age}岁`);
  if (user.city) bits.push(user.city);
  if (user.ipRegion) bits.push(`属地 ${user.ipRegion}`);
  if (user.isAdmin) bits.push("站务");
  else if ((user.modBoardIds && user.modBoardIds.length) || user.isModerator) bits.push("版主");
  if (!bits.length) return null;
  return <p className="who-meta">{bits.join(" · ")}</p>;
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

export function UserAvatar({ user, size = "sm", plain = false, square = false }) {
  if (!user) return null;
  const slug = plain ? null : user.dress?.frame?.slug;
  return (
    <span className={`u-avatar ${size}${square ? " sq" : ""}${slug ? ` fr-${slug}` : ""}`}>
      <img src={user.avatar} alt="" />
    </span>
  );
}

export function UserName({ user, withLevel = true, compactLevel = false }) {
  if (!user) return null;
  const d = user.dress || {};
  return (
    <span className="u-name">
      {user.nickname}
      {d.badge ? <i className={`u-badge b-${d.badge.slug}`}>{d.badge.mark || d.badge.name}</i> : null}
      {d.title ? <i className="u-wear">{d.title.mark || d.title.name}</i> : null}
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
      [gift.kind]: { id: gift.id, slug: gift.slug, name: gift.name, mark: gift.payload?.mark || gift.name }
    }
  };
  if (gift.kind === "frame") return <UserAvatar user={fake} size="lg" />;
  if (gift.kind === "badge" || gift.kind === "title") {
    return <div className="dress-demo-name"><UserName user={fake} withLevel={gift.kind === "title"} /></div>;
  }
  if (gift.kind === "bubble") return <div className={`dress-bub bub-${gift.slug}`}>这一刻想说</div>;
  return null;
}
