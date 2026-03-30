import { type ReactNode } from "react";

import {
  getHealthTone,
  getScoreStatusTone,
} from "@/lib/owner/formatters";
import {
  type OwnerHealthMarker,
  type Tone,
} from "@/lib/owner/types";

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
      {children}
    </p>
  );
}

export function HeaderMeta({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-medium text-[var(--text-strong)]">
        {value}
      </p>
    </div>
  );
}

export function SummaryStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold text-[var(--text-strong)]">
        {value}
      </p>
    </div>
  );
}

export function InlineTag({
  children,
  tone,
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className="inline-flex items-center border px-2.5 py-1 text-xs font-semibold"
      style={{
        backgroundColor: tone?.soft ?? "transparent",
        color: tone?.solid ?? "var(--text-body)",
        borderColor: tone?.solid ?? "var(--border)",
      }}
    >
      {children}
    </span>
  );
}

export function HealthMarkerItem({
  marker,
}: {
  marker: OwnerHealthMarker;
}) {
  const tone = getHealthTone(marker.label);
  const statusTone = getScoreStatusTone(marker.score);

  return (
    <div className="px-4 py-4 xl:px-5" style={{ backgroundColor: tone.soft }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--text-body)]">
            {marker.label}
          </p>
          <div className="mt-2 flex items-end gap-2">
            <p
              className="text-4xl font-semibold leading-none tracking-tight"
              style={{ color: tone.solid }}
            >
              {marker.score}
            </p>
            <p className="pb-1 text-sm font-medium text-[var(--text-muted)]">
              / 100
            </p>
          </div>
        </div>

        <InlineTag tone={statusTone}>{marker.statusLabel}</InlineTag>
      </div>

      <div className="mt-4 h-2 bg-white/65">
        <div
          className="h-2"
          style={{
            width: `${marker.score}%`,
            backgroundColor: tone.solid,
          }}
        />
      </div>

      <p className="mt-4 text-sm leading-6 text-[var(--text-body)]">
        {marker.explanation}
      </p>
      <p className="mt-2 text-xs font-medium text-[var(--text-muted)]">
        {marker.nextActionHint}
      </p>
    </div>
  );
}

export function DetailRow({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="border-t border-[var(--border)] py-4 first:border-t-0 first:pt-0 last:pb-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-[var(--text-strong)]">
        {value}
      </p>
      {helper ? (
        <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

export function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2 text-sm font-semibold transition"
      style={{
        backgroundColor: active ? "var(--text-strong)" : "transparent",
        color: active ? "#ffffff" : "var(--text-body)",
        border: active
          ? "1px solid var(--text-strong)"
          : "1px solid var(--border)",
      }}
    >
      {label}
    </button>
  );
}

export function DetailBullet({
  text,
  color,
}: {
  text: string;
  color: string;
}) {
  return (
    <li className="flex gap-3">
      <span
        className="mt-2 h-2.5 w-2.5 shrink-0"
        style={{ backgroundColor: color }}
      />
      <span>{text}</span>
    </li>
  );
}