import { Link } from "react-router-dom";
import type { PlaylistCard as PlaylistCardType } from "../api/types";
import { formatCount } from "../utils/format";
import Cover from "./Cover";

export default function PlaylistCard({
  item,
  large = false,
}: {
  item: PlaylistCardType;
  large?: boolean;
}) {
  return (
    <Link to={`/playlist/${item.id}`} className="pressable block min-w-0">
      <div className="relative">
        <Cover
          src={item.coverImgUrl}
          alt={item.name}
          size={large ? 400 : 280}
          className={large ? "aspect-square w-full" : "aspect-square w-full"}
          rounded="rounded-2xl"
        />
        {item.playCount ? (
          <span className="absolute right-1.5 top-1.5 rounded-full bg-black/45 px-1.5 py-0.5 text-[10px] text-white backdrop-blur-sm">
            {formatCount(item.playCount)}
          </span>
        ) : null}
      </div>
      <p className="mt-2 line-clamp-2 text-[13px] leading-5 text-[#F4F1EA]">{item.name}</p>
    </Link>
  );
}
