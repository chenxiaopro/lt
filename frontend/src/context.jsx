import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./api.js";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState("");
  const [site, setSite] = useState(null);

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
          installed: d.installed !== false
        });
      })
      .finally(() => setReady(true));
  }, []);

  const ctx = useMemo(
    () => ({
      user,
      setUser,
      ready,
      site,
      setSite,
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
      }
    }),
    [user, ready, toast, site]
  );

  return <AuthCtx.Provider value={ctx}>{children}</AuthCtx.Provider>;
}
