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
        "transition-colors",
        active
          ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
          : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-400 hover:text-zinc-950 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-400 dark:hover:text-white",
      ].join(" ")}
      aria-pressed={active}
      type="button"
    >
      {label}
    </button>
  );
}