import React, { useEffect, useRef, useState } from "react";

export function BackTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    function onScroll() {
      setShow(window.scrollY > window.innerHeight * 2);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!show) return null;
  return (
    <button
      type="button"
      className="back-top"
      aria-label="返回顶部"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      顶部
    </button>
  );
}

export function useInfiniteScroll({ hasMore, loadingMore, ready = true, onLoadMore }) {
  const sentinelRef = useRef(null);
  const cbRef = useRef(onLoadMore);
  cbRef.current = onLoadMore;
  const busyRef = useRef(false);

  useEffect(() => {
    busyRef.current = !!loadingMore;
  }, [loadingMore]);

  useEffect(() => {
    if (!ready || !hasMore || loadingMore) return undefined;
    const t = setTimeout(() => {
      const el = sentinelRef.current;
      if (!el || busyRef.current) return;
      if (el.getBoundingClientRect().top <= window.innerHeight) cbRef.current();
    }, 200);
    return () => clearTimeout(t);
  }, [ready, hasMore, loadingMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !ready || !hasMore) return undefined;
    if (typeof IntersectionObserver !== "function") return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !busyRef.current) cbRef.current();
      },
      { rootMargin: "0px 0px 100% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ready, hasMore]);

  return sentinelRef;
}
