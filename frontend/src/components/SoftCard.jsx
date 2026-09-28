import React from "react";
import { Link } from "react-router-dom";

export default function SoftCard({ item }) {
  if (!item) return null;
  return (
    <Link className="soft-embed" to={`/soft/${item.id}`}>
      <img src={item.icon} alt="" />
      <div className="grow">
        <b>{item.name}</b>
        <span>{item.version} · {item.size} · {item.category}</span>
      </div>
      <em>查看</em>
    </Link>
  );
}
