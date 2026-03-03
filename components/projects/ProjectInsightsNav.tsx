"use client";

import { useRouter } from "next/navigation";

export default function ProjectInsightsNav({ projectId }: { projectId: string }) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => router.push(`/projects/${projectId}/competitors`)}
        className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:text-black"
      >
        Dashboard
      </button>

      <button
        type="button"
        onClick={() => router.push(`/projects/${projectId}/authority`)}
        className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:text-black"
      >
        Authority
      </button>

      <button
        type="button"
        onClick={() => router.push(`/projects/${projectId}/momentum`)}
        className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:text-black"
      >
        Momentum
      </button>
    </div>
  );
}