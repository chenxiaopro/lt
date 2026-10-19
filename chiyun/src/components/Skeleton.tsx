export function Rect({ className = "" }: { className?: string }) {
  return <div className={`shimmer rounded-2xl bg-[#1c1c22] ${className}`} />;
}

export function Line({ className = "" }: { className?: string }) {
  return <div className={`shimmer h-3 rounded-full bg-[#1c1c22] ${className}`} />;
}
