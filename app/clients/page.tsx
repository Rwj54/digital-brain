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
    return <div className="p-8">Loading clients…</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-zinc-900 md:text-3xl">
          Clients
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-700 md:text-base">
          Create a client first, then use the client page to start URL-first
          project onboarding and open project dashboards.
        </p>
      </div>

      {status ? (
        <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-900">
          {status}
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-zinc-900">Create client</h2>
          <p className="mt-2 text-sm text-zinc-700">
            Keep this step lightweight. The client page will handle project
            onboarding and automation kickoff.
          </p>

          <form onSubmit={createClient} className="mt-5 grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-extrabold text-zinc-900">
                Client name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="JF Evans Lawn & Landscape"
                className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-500"
                required
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-extrabold text-zinc-900">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes about this client, market, or engagement."
                className="min-h-[120px] rounded-2xl border border-zinc-300 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-500"
              />
            </div>

            <button
              disabled={submitting}
              className="w-fit rounded-2xl border border-zinc-900 px-5 py-3 text-sm font-extrabold text-zinc-900 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Creating client…" : "Create client →"}
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-zinc-900">What happens next</h2>

          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl border border-zinc-200 p-4">
              <div className="text-sm font-extrabold text-zinc-900">
                1) Open client workspace
              </div>
              <div className="mt-1 text-xs text-zinc-600">
                Each client gets its own project list and onboarding entry
                surface at <span className="font-bold">/clients/[clientId]</span>.
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 p-4">
              <div className="text-sm font-extrabold text-zinc-900">
                2) Start URL-first project onboarding
              </div>
              <div className="mt-1 text-xs text-zinc-600">
                Enter the website URL plus transitional support inputs while the
                identity layer becomes smarter.
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 p-4">
              <div className="text-sm font-extrabold text-zinc-900">
                3) Kick off automation immediately
              </div>
              <div className="mt-1 text-xs text-zinc-600">
                Onboarding seeds keywords, enriches identity, and can launch
                competitor discovery from day one.
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 p-4">
              <div className="text-sm font-extrabold text-zinc-900">
                4) Land in project dashboard
              </div>
              <div className="mt-1 text-xs text-zinc-600">
                The user moves directly into the project dashboard instead of a
                dead-end setup flow.
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-black text-zinc-900">Existing clients</h2>
          <div className="text-sm text-zinc-600">
            {clients.length} client{clients.length === 1 ? "" : "s"}
          </div>
        </div>

        {clients.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-700">
            No clients yet. Create one above to begin.
          </div>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {clients.map((client) => (
              <div
                key={client.id}
                className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
              >
                <div className="text-lg font-black text-zinc-900">
                  {client.name}
                </div>

                <div className="mt-3 text-sm text-zinc-700">
                  {client.notes?.trim() ? client.notes : "No notes yet."}
                </div>

                <button
                  onClick={() => router.push(`/clients/${client.id}`)}
                  className="mt-4 rounded-2xl border border-zinc-900 px-4 py-2 text-sm font-extrabold text-zinc-900 transition hover:bg-zinc-50"
                >
                  Open client →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}