"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();

  const [loginName, setLoginName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();

    if (!loginName.trim() || !password.trim()) {
      alert("Login name and password required");
      return;
    }

    setLoading(true);

    const email = `${loginName.trim().toLowerCase()}@annvigold.local`;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message || "Login failed");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900">Annvi Login</h1>
        <p className="mt-1 text-sm text-gray-600">
          Enter your login name and password.
        </p>

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <input
            className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900"
            placeholder="Login Name"
            value={loginName}
            onChange={(e) => setLoginName(e.target.value)}
          />

          <input
            type="password"
            className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            disabled={loading}
            className="w-full rounded-xl bg-black p-3 font-semibold text-white disabled:bg-gray-400"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </main>
  );
}