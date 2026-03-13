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
  const normalized =
    typeof value === "string" ? value.trim() : "";

  return normalized ? normalized : "—";
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
      title="Business identity resolution"
      subtitle="Canonical project identity used by onboarding and downstream automation."
    >
      <div className="mt-2 grid gap-3">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="text-xs font-extrabold uppercase tracking-wide text-zinc-500">
            Website URL
          </div>
          <div className="mt-1 break-all text-sm font-semibold text-zinc-900">
            {displayValue(siteUrl)}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="text-xs font-extrabold uppercase tracking-wide text-zinc-500">
              Target domain
            </div>
            <div className="mt-1 break-all text-sm font-semibold text-zinc-900">
              {displayValue(targetDomain)}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="text-xs font-extrabold uppercase tracking-wide text-zinc-500">
              Target brand name
            </div>
            <div className="mt-1 text-sm font-semibold text-zinc-900">
              {displayValue(targetBrandName)}
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="text-xs font-extrabold uppercase tracking-wide text-zinc-500">
              Category
            </div>
            <div className="mt-1 text-sm font-semibold text-zinc-900">
              {displayValue(category)}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="text-xs font-extrabold uppercase tracking-wide text-zinc-500">
              Metro
            </div>
            <div className="mt-1 text-sm font-semibold text-zinc-900">
              {displayValue(metro)}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="text-xs font-extrabold uppercase tracking-wide text-zinc-500">
              Radius miles
            </div>
            <div className="mt-1 text-sm font-semibold text-zinc-900">
              {typeof radiusMiles === "number" && Number.isFinite(radiusMiles)
                ? `${Math.round(radiusMiles)}`
                : "—"}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-xs leading-5 text-zinc-600">
          Matching priority is moving toward:
          <span className="mx-1 font-bold text-zinc-900">target_place_id</span>
          →
          <span className="mx-1 font-bold text-zinc-900">target_domain</span>
          →
          <span className="mx-1 font-bold text-zinc-900">target_business_name</span>
          →
          <span className="mx-1 font-bold text-zinc-900">target_brand_name</span>.
        </div>
      </div>
    </Card>
  );
}