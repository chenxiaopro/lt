import React from "react";

export default function VideoPlayer({ src, className = "", compact = false }) {
  if (!src) return null;
  return (
    <div className={`video-player${compact ? " compact" : ""}${className ? ` ${className}` : ""}`}>
      <video src={src} controls playsInline preload="metadata" />
    </div>
  );
}
