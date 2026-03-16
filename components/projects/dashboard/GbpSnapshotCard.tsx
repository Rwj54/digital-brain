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
      <form onSubmit={onSaveGbpProfile} className="mt-2 grid gap-3">
        <input
          value={gbpName}
          onChange={(e) => setGbpName(e.target.value)}
          placeholder="GBP Business Name"
          className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 placeholder:text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-400"
        />

        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={primaryCategory}
            onChange={(e) => setPrimaryCategory(e.target.value)}
            placeholder="Primary category (ex: Landscaper)"
            className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 placeholder:text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-400"
          />
          <input
            value={placeId}
            onChange={(e) => setPlaceId(e.target.value)}
            placeholder="Place ID (optional)"
            className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 placeholder:text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-400"
          />
        </div>

        <input
          value={gbpUrl}
          onChange={(e) => setGbpUrl(e.target.value)}
          placeholder="GBP / Maps URL (optional)"
          className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 placeholder:text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-400"
        />

        <div className="grid gap-3 md:grid-cols-3">
          <input
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            placeholder="Rating (ex: 4.7)"
            className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 placeholder:text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-400"
          />
          <input
            value={totalReviews}
            onChange={(e) => setTotalReviews(e.target.value)}
            placeholder="Total reviews (ex: 128)"
            className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 placeholder:text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-400"
          />
          <input
            value={photosCount}
            onChange={(e) => setPhotosCount(e.target.value)}
            placeholder="Photos (optional)"
            className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 placeholder:text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-400"
          />
        </div>

        <button
          className="w-fit rounded-xl border border-zinc-900 px-4 py-2 text-sm font-extrabold text-zinc-950 hover:bg-zinc-50 dark:border-zinc-200 dark:text-zinc-50 dark:hover:bg-zinc-800"
          type="submit"
        >
          Save GBP snapshot
        </button>
      </form>
    </Card>
  );
}