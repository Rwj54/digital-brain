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
      className="flex flex-1 flex-col items-center justify-center gap-1 py-2 transition"
      aria-current={active ? "page" : undefined}
      type="button"
      style={{
        color: active ? "var(--text-strong)" : "var(--text-muted)",
      }}
    >
      <span
        className="h-px w-10 transition"
        style={{
          backgroundColor: active ? "var(--brand-700)" : "transparent",
        }}
      />
      <span className="text-[12px] font-semibold tracking-[0.01em]">{label}</span>
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
    <div
      className="fixed inset-x-0 bottom-0 z-50 border-t backdrop-blur md:hidden"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "color-mix(in srgb, var(--app-bg) 94%, white 6%)",
      }}
    >
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