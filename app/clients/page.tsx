"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type ClientRow = {
  id: string;
  name: string;
  notes: string | null;
  created_at: string;
};

function formatCreatedAt(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unknown";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ClientsPage() {
  const router = useRouter();

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  const requireAuth = useCallback(async (): Promise<boolean> => {
    const { data } = await supabase.auth.getSession();

    if (!data.session) {
      router.replace("/login");
      return false;
    }

    return true;
  }, [router]);

  const loadClients = useCallback(async () => {
    setLoading(true);
    setStatus(null);

    const { data, error } = await supabase
      .from("clients")
      .select("id, name, notes, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setStatus(error.message);
      setLoading(false);
      return;
    }

    setClients((data ?? []) as ClientRow[]);
    setLoading(false);
  }, []);

  async function createClient(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    setSubmitting(true);

    const normalizedName = name.trim();
    const normalizedNotes = notes.trim();

    if (!normalizedName) {
      setStatus("Client name is required.");
      setSubmitting(false);
      return;
    }

    const { data, error } = await supabase
      .from("clients")
      .insert({
        name: normalizedName,
        notes: normalizedNotes ? normalizedNotes : null,
      })
      .select("id")
      .single();

    if (error) {
      setStatus(error.message);
      setSubmitting(false);
      return;
    }

    setName("");
    setNotes("");
    setSubmitting(false);

    router.push(`/clients/${data.id}`);
  }

  useEffect(() => {
    let isActive = true;

    void (async () => {
      const isAuthed = await requireAuth();

      if (!isAuthed || !isActive) {
        return;
      }

      await loadClients();
    })();

    return () => {
      isActive = false;
    };
  }, [requireAuth, loadClients]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--text-strong)] sm:px-6">
        <div className="mx-auto max-w-6xl">
          <section className="border-t border-[var(--border)] py-6">
            <p className="text-base text-[var(--text-body)]">Loading clients...</p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-[var(--text-strong)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8">
        <section className="border-b border-[var(--border)] pb-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_260px] lg:items-start lg:gap-8">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-700)]">
                Client intake
              </p>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text-strong)] sm:text-[2.15rem] sm:leading-tight">
                Create the client first, then move into project intake.
              </h1>

              <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--text-body)]">
                Keep this step simple. Once the client exists, the next screen becomes
                the working place for project setup, URL-first onboarding, and the move
                into an active Digital Brain project.
              </p>
            </div>

            <div className="border-l border-[var(--border)] pl-5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                Flow
              </div>

              <ol className="mt-3 grid gap-3 text-sm text-[var(--text-body)]">
                <li className="border-t border-[var(--border)] pt-3">
                  <span className="font-semibold text-[var(--text-strong)]">1.</span>{" "}
                  Create the client record.
                </li>
                <li className="border-t border-[var(--border)] pt-3">
                  <span className="font-semibold text-[var(--text-strong)]">2.</span>{" "}
                  Open the client workspace.
                </li>
                <li className="border-t border-[var(--border)] pt-3">
                  <span className="font-semibold text-[var(--text-strong)]">3.</span>{" "}
                  Start URL-first project onboarding.
                </li>
              </ol>
            </div>
          </div>
        </section>

        {status ? (
          <section className="border-l-4 border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3">
            <p className="text-sm font-medium text-[var(--danger)]">{status}</p>
          </section>
        ) : null}

        <section className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <section className="border-t border-[var(--border)] pt-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Create client
            </p>

            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-strong)]">
              Keep this first step lightweight.
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--text-body)]">
              This page only creates the client. The next screen handles project intake,
              onboarding kickoff, and the move into the working project surface.
            </p>

            <form onSubmit={createClient} className="mt-6 grid gap-5">
              <div className="grid gap-2">
                <label className="text-sm font-semibold text-[var(--text-strong)]">
                  Client name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="JF Evans Lawn & Landscape"
                  className="border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--text-strong)] placeholder:text-[var(--text-muted)] outline-none transition focus:border-[var(--brand-600)]"
                  required
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-semibold text-[var(--text-strong)]">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes about this client, market, or engagement."
                  className="min-h-[120px] border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--text-strong)] placeholder:text-[var(--text-muted)] outline-none transition focus:border-[var(--brand-600)]"
                />
              </div>

              <div className="pt-1">
                <button
                  disabled={submitting}
                  className="inline-flex items-center justify-center border border-[var(--brand-600)] bg-[var(--brand-600)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? "Creating client..." : "Create client"}
                </button>
              </div>
            </form>
          </section>

          <section className="border-t border-[var(--border)] pt-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Existing clients
                </p>

                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-strong)]">
                  Open a client workspace
                </h2>
              </div>

              <div className="text-sm text-[var(--text-body)]">
                <span className="font-semibold text-[var(--text-strong)]">
                  {clients.length}
                </span>{" "}
                client{clients.length === 1 ? "" : "s"}
              </div>
            </div>

            {clients.length === 0 ? (
              <div className="mt-6 border-t border-[var(--border)] pt-4">
                <p className="text-sm leading-7 text-[var(--text-body)]">
                  No clients yet. Create one on the left to begin.
                </p>
              </div>
            ) : (
              <div className="mt-6 border-t border-[var(--border)]">
                {clients.map((client) => (
                  <article
                    key={client.id}
                    className="grid gap-4 border-t border-[var(--border)] py-5 first:border-t-0 first:pt-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:gap-6"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h3 className="text-lg font-semibold text-[var(--text-strong)]">
                          {client.name}
                        </h3>
                        <span className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
                          Added {formatCreatedAt(client.created_at)}
                        </span>
                      </div>

                      <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-body)]">
                        {client.notes?.trim()
                          ? client.notes
                          : "No notes yet. Open the client workspace to start project intake."}
                      </p>
                    </div>

                    <div className="md:pt-1">
                      <button
                        onClick={() => router.push(`/clients/${client.id}`)}
                        className="inline-flex items-center justify-center border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--text-strong)] transition hover:border-[var(--brand-600)] hover:text-[var(--brand-700)]"
                      >
                        Open client
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}