import { Outlet, useLocation } from "react-router-dom";
import BottomNav from "./BottomNav";
import FullPlayer from "./FullPlayer";
import MiniPlayer from "./MiniPlayer";
import { usePlayer } from "../store/PlayerContext";

const tabPaths = new Set(["/", "/rank", "/search", "/mine"]);

export default function Layout() {
  const { pathname } = useLocation();
  const { current } = usePlayer();
  const showTab = tabPaths.has(pathname);
  const bottomPad = showTab ? (current ? "pb-[140px]" : "pb-[70px]") : current ? "pb-[86px]" : "pb-4";

  return (
    <div className="min-h-dvh bg-[#050506]">
      <div className="relative mx-auto min-h-dvh max-w-[480px] overflow-hidden bg-[#09090B] shadow-[0_0_80px_rgba(232,60,60,0.08)]">
        <main className={bottomPad}>
          <Outlet />
        </main>
        <a
          href="/messages"
          target="_parent"
          className="fixed left-3 top-[max(10px,env(safe-area-inset-top))] z-50 rounded-full bg-black/55 px-3 py-1.5 text-xs text-white/90 backdrop-blur"
        >
          返回三楼
        </a>
        <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px]">
          <MiniPlayer />
          {showTab ? <BottomNav /> : null}
        </div>
        <FullPlayer />
      </div>
    </div>
  );
}
