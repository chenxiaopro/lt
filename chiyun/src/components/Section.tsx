import type { ReactNode } from "react";

export default function Section({
  title,
  extra,
  children,
}: {
  title: string;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mt-6">
      <div className="mb-3 flex items-end justify-between px-4">
        <h2 className="text-lg font-semibold tracking-wide">{title}</h2>
        {extra}
      </div>
      {children}
    </section>
  );
}
