import { Card } from "@/components/projects/dashboard/Card";

type IdentityResolutionCardProps = {
  siteUrl: string | null;
  targetDomain: string | null;
  targetBrandName: string | null;
  category: string | null;
  metro: string | null;
  radiusMiles: number | null;
};

function displayValue(value: string | null | undefined): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized ? normalized : "—";
}

function IdentityRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className="grid gap-3 py-4 first:pt-0 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-6"
      style={{ borderTop: "1px solid rgba(15, 104, 128, 0.14)" }}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-700)]">
        {label}
      </div>
      <div className="break-all text-sm font-semibold leading-7 text-[var(--text-strong)]">
        {value}
      </div>
    </div>
  );
}

export function IdentityResolutionCard({
  siteUrl,
  targetDomain,
  targetBrandName,
  category,
  metro,
  radiusMiles,
}: IdentityResolutionCardProps) {
  return (
    <Card
      title="Business identity"
      subtitle="Core project identity used by onboarding and downstream automation."
    >
      <div
        className="border"
        style={{ borderColor: "var(--brand-700)" }}
      >
        <div
          className="border-b px-5 py-4 sm:px-6"
          style={{
            borderColor: "rgba(255,255,255,0.18)",
            background:
              "linear-gradient(135deg, var(--brand-700) 0%, var(--brand-600) 62%, #1798bb 100%)",
          }}
        >
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/84">
            Identity anchor
          </div>
          <div className="mt-2 max-w-3xl text-sm leading-7 text-white/92">
            This is the source-of-truth business identity Digital Brain should use
            for matching, onboarding, profile resolution, and downstream action logic.
          </div>
        </div>

        <div
          className="px-5 py-5 sm:px-6"
          style={{ backgroundColor: "rgba(235, 248, 250, 0.96)" }}
        >
          <div className="grid gap-0">
            <IdentityRow label="Website URL" value={displayValue(siteUrl)} />
            <IdentityRow label="Target domain" value={displayValue(targetDomain)} />
            <IdentityRow
              label="Target brand name"
              value={displayValue(targetBrandName)}
            />
            <IdentityRow label="Category" value={displayValue(category)} />
            <IdentityRow label="Metro" value={displayValue(metro)} />
            <IdentityRow
              label="Radius miles"
              value={
                typeof radiusMiles === "number" && Number.isFinite(radiusMiles)
                  ? `${Math.round(radiusMiles)}`
                  : "—"
              }
            />
          </div>

          <div
            className="mt-5 border-l-2 pl-4 text-xs leading-6 text-[var(--text-body)]"
            style={{ borderColor: "var(--brand-600)" }}
          >
            Matching priority is moving toward{" "}
            <span className="font-bold text-[var(--text-strong)]">target_place_id</span> →{" "}
            <span className="font-bold text-[var(--text-strong)]">target_domain</span> →{" "}
            <span className="font-bold text-[var(--text-strong)]">target_business_name</span> →{" "}
            <span className="font-bold text-[var(--text-strong)]">target_brand_name</span>.
          </div>
        </div>
      </div>
    </Card>
  );
}