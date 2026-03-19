import type { ReactNode } from "react";

type OwnerCardProps = {
  children: ReactNode;
  className?: string;
};

export function OwnerCard({ children, className = "" }: OwnerCardProps) {
  return (
    <div
      className={[
        "rounded-3xl border border-slate-200 bg-white shadow-sm",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}