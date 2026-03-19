type OwnerPillProps = {
  label: string;
  tone?: "brand" | "neutral";
};

export function OwnerPill({ label, tone = "brand" }: OwnerPillProps) {
  return (
    <span
      className={[
        "inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]",
        tone === "brand"
          ? "bg-sky-50 text-sky-800"
          : "bg-white text-slate-500",
      ].join(" ")}
    >
      {label}
    </span>
  );
}