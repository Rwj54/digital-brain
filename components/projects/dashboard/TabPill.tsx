type TabPillProps = {
  active: boolean;
  label: string;
  onClick: () => void;
};

export function TabPill({ active, label, onClick }: TabPillProps) {
  return (
    <button
      onClick={onClick}
      className={[
        "whitespace-nowrap rounded-full border px-3 py-2 text-sm font-extrabold",
        "transition",
        active
          ? "border-zinc-900 bg-zinc-900 text-white"
          : "border-zinc-900/70 text-zinc-900/80 hover:border-zinc-900 hover:text-zinc-900",
      ].join(" ")}
    >
      {label}
    </button>
  );
}