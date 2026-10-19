import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api.js";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState("");
  const [site, setSite] = useState(null);
  const [unread, setUnread] = useState(0);
  const unreadTick = useRef(0);
  const unreadSeen = useRef(-1);
  const dingRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("qh_token");
    const cfg = api("/api/config").catch(() => ({
      name: "青葫三楼",
      tagline: "幸运、趣事尽在青葫社区",
      installed: true
    }));
    const me = token
      ? api("/api/auth/me")
          .then((d) => setUser(d.user))
          .catch(() => localStorage.removeItem("qh_token"))
      : Promise.resolve();
    Promise.all([cfg, me])
      .then(([d]) => {
        setSite({
          name: d.name || "青葫三楼",
          tagline: d.tagline || "幸运、趣事尽在青葫社区",
          installed: d.installed !== false,
          videoMaxMb: Number(d.videoMaxMb) || 80
        });
      })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    function unlock() {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        if (!dingRef.current) dingRef.current = new AC();
        if (dingRef.current.state === "suspended") dingRef.current.resume();
      } catch { /* ignore */ }
    }
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  function playDing() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!dingRef.current) dingRef.current = new AC();
      const ctx = dingRef.current;
      if (ctx.state === "suspended") ctx.resume();
      const t0 = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(880, t0);
      o.frequency.exponentialRampToValueAtTime(1320, t0 + 0.07);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.08, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t0);
      o.stop(t0 + 0.24);
    } catch { /* autoplay */ }
  }

  const refreshUnread = useCallback(async () => {
    const my = ++unreadTick.current;
    if (!localStorage.getItem("qh_token")) {
      unreadSeen.current = -1;
      if (my === unreadTick.current) setUnread(0);
      return;
    }
    const d = await api("/api/badge").catch(() => ({ unread: 0 }));
    if (my !== unreadTick.current) return;
    const total = d.unread || 0;
    if (unreadSeen.current >= 0 && total > unreadSeen.current) playDing();
    unreadSeen.current = total;
    setUnread(total);
  }, []);

  const bumpUnread = useCallback((delta) => {
    setUnread((n) => Math.max(0, n + delta));
  }, []);

  const ctx = useMemo(
    () => ({
      user,
      setUser,
      ready,
      site,
      setSite,
      unread,
      refreshUnread,
      bumpUnread,
      toast: (t) => setToast(t),
      toastText: toast,
      clearToast: () => setToast(""),
      login: (token, u) => {
        localStorage.setItem("qh_token", token);
        setUser(u);
      },
      logout: () => {
        localStorage.removeItem("qh_token");
        setUser(null);
        unreadTick.current += 1;
        unreadSeen.current = -1;
        setUnread(0);
      }
    }),
    [user, ready, toast, site, unread, refreshUnread, bumpUnread]
  );

  return <AuthCtx.Provider value={ctx}>{children}</AuthCtx.Provider>;
}
