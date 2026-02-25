"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/clients`
        : undefined;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    setLoading(false);

    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus("Check your email for a sign-in link.");
  }

  return (
    <div style={{ maxWidth: 420, margin: "60px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>Digital Brain v1</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Sign in to access your dashboard.
      </p>

      <form onSubmit={signInWithEmail} style={{ marginTop: 24 }}>
        <label style={{ display: "block", fontWeight: 600 }}>Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
          placeholder="you@company.com"
          style={{
            width: "100%",
            padding: 10,
            marginTop: 8,
            borderRadius: 8,
            border: "1px solid #ccc",
          }}
        />
        <button
          disabled={loading}
          style={{
            width: "100%",
            marginTop: 12,
            padding: 10,
            borderRadius: 8,
            border: "1px solid #111",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          {loading ? "Sending link..." : "Send sign-in link"}
        </button>
      </form>

      {status && (
        <p style={{ marginTop: 12, fontSize: 14, opacity: 0.9 }}>{status}</p>
      )}

      <button
        onClick={() => router.push("/clients")}
        style={{
          marginTop: 18,
          fontSize: 12,
          opacity: 0.7,
          textDecoration: "underline",
          cursor: "pointer",
          background: "transparent",
          border: "none",
          padding: 0,
        }}
      >
        Go to clients (will redirect to login if not signed in)
      </button>
    </div>
  );
}
