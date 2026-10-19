import React from "react";

export default function Chiyun() {
  return (
    <div className="mini-app-page">
      <iframe
        className="mini-app-frame"
        title="赤云音乐"
        src="/chiyun-app/index.html"
        allow="autoplay; fullscreen"
      />
    </div>
  );
}
