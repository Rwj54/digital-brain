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
      <form onSubmit={onSaveGbpProfile} className="grid gap-4">
        <div className="rounded-2xl border border-zinc-200 bg-white/90 p-4">
          <div className="grid gap-2">
            <label className="text-sm font-extrabold text-zinc-950">
              GBP business name
            </label>
            <input
              value={gbpName}
              onChange={(e) => setGbpName(e.target.value)}
              placeholder="Business name"
              className="rounded-2xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4">
            <div className="grid gap-2">
              <label className="text-sm font-extrabold text-zinc-950">
                Primary category
              </label>
              <input
                value={primaryCategory}
                onChange={(e) => setPrimaryCategory(e.target.value)}
                placeholder="Example: Landscaper"
                className="rounded-2xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4">
            <div className="grid gap-2">
              <label className="text-sm font-extrabold text-zinc-950">
                Place ID
              </label>
              <input
                value={placeId}
                onChange={(e) => setPlaceId(e.target.value)}
                placeholder="Optional"
                className="rounded-2xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white/90 p-4">
          <div className="grid gap-2">
            <label className="text-sm font-extrabold text-zinc-950">
              GBP or Maps URL
            </label>
            <input
              value={gbpUrl}
              onChange={(e) => setGbpUrl(e.target.value)}
              placeholder="Optional"
              className="rounded-2xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white/90 p-4">
            <div className="grid gap-2">
              <label className="text-sm font-extrabold text-zinc-950">
                Rating
              </label>
              <input
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                placeholder="Example: 4.7"
                className="rounded-2xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white/90 p-4">
            <div className="grid gap-2">
              <label className="text-sm font-extrabold text-zinc-950">
                Total reviews
              </label>
              <input
                value={totalReviews}
                onChange={(e) => setTotalReviews(e.target.value)}
                placeholder="Example: 128"
                className="rounded-2xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white/90 p-4">
            <div className="grid gap-2">
              <label className="text-sm font-extrabold text-zinc-950">
                Photos
              </label>
              <input
                value={photosCount}
                onChange={(e) => setPhotosCount(e.target.value)}
                placeholder="Optional"
                className="rounded-2xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
              />
            </div>
          </div>
        </div>

        <div>
          <button
            className="w-fit rounded-2xl border border-zinc-950 bg-zinc-950 px-4 py-2.5 text-sm font-extrabold text-white transition hover:opacity-90"
            type="submit"
          >
            Save GBP snapshot
          </button>
        </div>
      </form>
    </Card>
  );
}
