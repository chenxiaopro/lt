import { Link } from "react-router-dom";
import type { AlbumCard, MvItem, RadioItem } from "../api/types";
import { formatCount } from "../utils/format";
import Cover from "./Cover";

export function AlbumTile({ item }: { item: AlbumCard }) {
  return (
    <Link to={`/album/${item.id}`} className="pressable block min-w-0">
      <Cover src={item.picUrl} alt={item.name} size={320} className="aspect-square w-full" rounded="rounded-2xl" />
      <p className="mt-2 line-clamp-2 text-[13px] leading-5">{item.name}</p>
      {item.artistName ? <p className="truncate text-xs text-[#8E8A96]">{item.artistName}</p> : null}
    </Link>
  );
}

export function MvTile({ item }: { item: MvItem }) {
  return (
    <Link to={`/mv/${item.id}`} className="pressable block min-w-0">
      <div className="relative">
        <Cover
          src={item.cover}
          alt={item.name}
          size={480}
          className="aspect-video w-full"
          rounded="rounded-2xl"
        />
        {item.playCount ? (
          <span className="absolute right-1.5 top-1.5 rounded-full bg-black/45 px-1.5 py-0.5 text-[10px] text-white">
            {formatCount(item.playCount)}
          </span>
        ) : null}
      </div>
      <p className="mt-2 line-clamp-2 text-[13px] leading-5">{item.name}</p>
      {item.artistName ? <p className="truncate text-xs text-[#8E8A96]">{item.artistName}</p> : null}
    </Link>
  );
}

export function RadioTile({ item }: { item: RadioItem }) {
  return (
    <Link to={`/radio/${item.id}`} className="pressable block min-w-0">
      <Cover src={item.picUrl} alt={item.name} size={320} className="aspect-square w-full" rounded="rounded-2xl" />
      <p className="mt-2 line-clamp-2 text-[13px] leading-5">{item.name}</p>
      {item.category ? <p className="truncate text-xs text-[#8E8A96]">{item.category}</p> : null}
    </Link>
  );
}
