"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        router.replace("/login");
        return;
      }

      if (data.session) {
        router.replace("/clients");
        return;
      }

      router.replace("/login");
    })();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="text-sm text-zinc-500">Loading…</div>
    </div>
  );
}