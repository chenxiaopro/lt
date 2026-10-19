import { Compass, Search, Trophy, UserRound } from "lucide-react";
import { NavLink } from "react-router-dom";

const items = [
  { to: "/", label: "发现", icon: Compass, end: true },
  { to: "/rank", label: "排行", icon: Trophy, end: false },
  { to: "/search", label: "搜索", icon: Search, end: false },
  { to: "/mine", label: "我的", icon: UserRound, end: false },
];

export default function BottomNav() {
  return (
    <nav className="grid h-[58px] grid-cols-4 border-t border-white/5 bg-[#0d0d11]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 text-[11px] ${
                isActive ? "text-[#E83C3C]" : "text-[#8E8A96]"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.4 : 1.8} />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
