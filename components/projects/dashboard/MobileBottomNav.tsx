type TabKey = "overview" | "data" | "actions" | "settings";

function MobileBottomNavItem({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "flex flex-1 flex-col items-center justify-center gap-1 py-2",
        active ? "text-zinc-900" : "text-zinc-500",
      ].join(" ")}
      aria-current={active ? "page" : undefined}
    >
      <span
        className={[
          "h-1.5 w-10 rounded-full",
          active ? "bg-zinc-900" : "bg-transparent",
        ].join(" ")}
      />
      <span className="text-[12px] font-extrabold">{label}</span>
    </button>
  );
}

export function MobileBottomNav({
  tab,
  setTab,
}: {
  tab: TabKey;
  setTab: (t: TabKey) => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/95 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-6xl px-2">
        <MobileBottomNavItem
          active={tab === "overview"}
          label="Overview"
          onClick={() => setTab("overview")}
        />
        <MobileBottomNavItem
          active={tab === "data"}
          label="Data"
          onClick={() => setTab("data")}
        />
        <MobileBottomNavItem
          active={tab === "actions"}
          label="Actions"
          onClick={() => setTab("actions")}
        />
        <MobileBottomNavItem
          active={tab === "settings"}
          label="Settings"
          onClick={() => setTab("settings")}
        />
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </div>
  );
}