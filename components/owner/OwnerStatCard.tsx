import type { ReactNode } from "react";

import { OwnerCard } from "@/components/owner/OwnerCard";

type OwnerStatCardProps = {
  label: string;
  value: ReactNode;
  accent?: boolean;
};

export function OwnerStatCard({
  label,
  value,
  accent = false,
}: OwnerStatCardProps) {
  return (
    <OwnerCard
      className={
        accent
          ? "border-sky-200 bg-sky-50 p-5"
          : "bg-white p-5"
      }
    >
      <p
        className={[
          "text-sm font-medium",
          accent ? "text-sky-800" : "text-slate-500",
        ].join(" ")}
      >
        {label}
      </p>
      <div className="mt-3 text-slate-950">{value}</div>
    </OwnerCard>
  );
}