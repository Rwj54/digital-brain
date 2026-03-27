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
    <div className="grid gap-2 border-t border-[var(--border)] py-4 first:border-t-0 first:pt-0 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-6">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
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
      <div className="grid gap-6">
        <section className="border border-[var(--border)] bg-[var(--reference-soft)] px-5 py-5 sm:px-6">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-700)]">
            Identity anchor
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--text-body)]">
            This is the source-of-truth business identity Digital Brain should use
            for matching, onboarding, profile resolution, and downstream action logic.
          </p>
        </section>

        <section className="border border-[var(--border)] bg-white px-5 py-5 sm:px-6">
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
        </section>

        <section className="border-l-2 border-[var(--brand-600)] pl-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-700)]">
            Matching priority
          </div>
          <p className="mt-2 text-sm leading-7 text-[var(--text-body)]">
            Matching priority is moving toward{" "}
            <span className="font-semibold text-[var(--text-strong)]">
              target_place_id
            </span>{" "}
            →{" "}
            <span className="font-semibold text-[var(--text-strong)]">
              target_domain
            </span>{" "}
            →{" "}
            <span className="font-semibold text-[var(--text-strong)]">
              target_business_name
            </span>{" "}
            →{" "}
            <span className="font-semibold text-[var(--text-strong)]">
              target_brand_name
            </span>
            .
          </p>
        </section>
      </div>
    </Card>
  );
}