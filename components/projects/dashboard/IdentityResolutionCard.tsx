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
      <div className="grid gap-4">
        <div className="rounded-2xl border border-zinc-200 bg-white/90 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Website URL
          </div>
          <div className="mt-2 break-all text-sm font-extrabold text-zinc-950">
            {displayValue(siteUrl)}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Target domain
            </div>
            <div className="mt-2 break-all text-sm font-extrabold text-zinc-950">
              {displayValue(targetDomain)}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Target brand name
            </div>
            <div className="mt-2 text-sm font-extrabold text-zinc-950">
              {displayValue(targetBrandName)}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white/90 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Category
            </div>
            <div className="mt-2 text-sm font-extrabold text-zinc-950">
              {displayValue(category)}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white/90 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Metro
            </div>
            <div className="mt-2 text-sm font-extrabold text-zinc-950">
              {displayValue(metro)}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white/90 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Radius miles
            </div>
            <div className="mt-2 text-sm font-extrabold text-zinc-950">
              {typeof radiusMiles === "number" && Number.isFinite(radiusMiles)
                ? `${Math.round(radiusMiles)}`
                : "—"}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950">
          Matching priority is moving toward{" "}
          <span className="font-bold">target_place_id</span> →{" "}
          <span className="font-bold">target_domain</span> →{" "}
          <span className="font-bold">target_business_name</span> →{" "}
          <span className="font-bold">target_brand_name</span>.
        </div>
      </div>
    </Card>
  );
}
