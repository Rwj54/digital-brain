import { Card } from "@/components/projects/dashboard/Card";

type GbpSnapshotCardProps = {
  gbpName: string;
  primaryCategory: string;
  placeId: string;
  gbpUrl: string;
  rating: string;
  totalReviews: string;
  photosCount: string;
  onSaveGbpProfile: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  setGbpName: React.Dispatch<React.SetStateAction<string>>;
  setPrimaryCategory: React.Dispatch<React.SetStateAction<string>>;
  setPlaceId: React.Dispatch<React.SetStateAction<string>>;
  setGbpUrl: React.Dispatch<React.SetStateAction<string>>;
  setRating: React.Dispatch<React.SetStateAction<string>>;
  setTotalReviews: React.Dispatch<React.SetStateAction<string>>;
  setPhotosCount: React.Dispatch<React.SetStateAction<string>>;
};

function FieldLabel({
  title,
  helper,
}: {
  title: string;
  helper?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-950/80">
        {title}
      </div>
      {helper ? (
        <div className="mt-2 max-w-sm text-sm leading-6 text-slate-700">
          {helper}
        </div>
      ) : null}
    </div>
  );
}

function FormInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "w-full border-0 border-b-2 border-emerald-500 bg-transparent px-0 py-3 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-800 focus:ring-0",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

export function GbpSnapshotCard({
  gbpName,
  primaryCategory,
  placeId,
  gbpUrl,
  rating,
  totalReviews,
  photosCount,
  onSaveGbpProfile,
  setGbpName,
  setPrimaryCategory,
  setPlaceId,
  setGbpUrl,
  setRating,
  setTotalReviews,
  setPhotosCount,
}: GbpSnapshotCardProps) {
  return (
    <Card title="Your GBP snapshot" subtitle="Manual MVP. Automation later.">
      <div className="border border-emerald-500 bg-emerald-100/80">
        <div className="border-b border-emerald-500 bg-emerald-200 px-5 py-4 sm:px-6">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-950">
            Google Business Profile snapshot
          </div>
          <div className="mt-2 max-w-3xl text-sm leading-7 text-slate-800">
            Enter the core GBP details Digital Brain should use as the project’s
            current starting point.
          </div>
        </div>

        <form onSubmit={onSaveGbpProfile} className="grid gap-0">
          <div className="grid gap-5 border-b border-emerald-500 px-5 py-5 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)]">
            <FieldLabel
              title="GBP business name"
              helper="Use the visible business name exactly as shown in Google."
            />
            <FormInput
              value={gbpName}
              onChange={(e) => setGbpName(e.target.value)}
              placeholder="Business name"
            />
          </div>

          <div className="grid gap-6 border-b border-emerald-500 px-5 py-5 sm:px-6 lg:grid-cols-2">
            <div className="grid gap-3">
              <FieldLabel
                title="Primary category"
                helper="Example: Landscaper"
              />
              <FormInput
                value={primaryCategory}
                onChange={(e) => setPrimaryCategory(e.target.value)}
                placeholder="Primary category"
              />
            </div>

            <div className="grid gap-3">
              <FieldLabel
                title="Place ID"
                helper="Optional, but strong when available."
              />
              <FormInput
                value={placeId}
                onChange={(e) => setPlaceId(e.target.value)}
                placeholder="Place ID"
              />
            </div>
          </div>

          <div className="grid gap-5 border-b border-emerald-500 px-5 py-5 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)]">
            <FieldLabel
              title="GBP or Maps URL"
              helper="Optional direct URL to the business profile."
            />
            <FormInput
              value={gbpUrl}
              onChange={(e) => setGbpUrl(e.target.value)}
              placeholder="GBP or Maps URL"
            />
          </div>

          <div className="grid gap-6 px-5 py-5 sm:px-6 lg:grid-cols-3">
            <div className="grid gap-3">
              <FieldLabel title="Rating" helper="Example: 4.7" />
              <FormInput
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                placeholder="Rating"
              />
            </div>

            <div className="grid gap-3">
              <FieldLabel title="Total reviews" helper="Example: 128" />
              <FormInput
                value={totalReviews}
                onChange={(e) => setTotalReviews(e.target.value)}
                placeholder="Total reviews"
              />
            </div>

            <div className="grid gap-3">
              <FieldLabel title="Photos" helper="Optional photo count" />
              <FormInput
                value={photosCount}
                onChange={(e) => setPhotosCount(e.target.value)}
                placeholder="Photos"
              />
            </div>
          </div>

          <div className="border-t border-emerald-500 px-5 py-5 sm:px-6">
            <button
              className="border border-emerald-900 bg-emerald-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-950"
              type="submit"
            >
              Save GBP snapshot
            </button>
          </div>
        </form>
      </div>
    </Card>
  );
}