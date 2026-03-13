export function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2 py-1 text-[11px] font-extrabold",
        ok
          ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border border-amber-200 bg-amber-50 text-amber-700",
      ].join(" ")}
    >
      {label}
    </span>
  );
}