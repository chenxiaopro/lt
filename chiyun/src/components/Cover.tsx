import { imgUrl } from "../utils/format";

export default function Cover({
  src,
  alt,
  size = 200,
  className = "",
  rounded = "rounded-xl",
}: {
  src?: string;
  alt: string;
  size?: number;
  className?: string;
  rounded?: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-[#1c1c22] ${rounded} ${className}`}>
      {src ? (
        <img
          src={imgUrl(src, size)}
          alt={alt}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="h-full w-full bg-[#1c1c22]" />
      )}
    </div>
  );
}
