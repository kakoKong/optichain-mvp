import { useState } from "react";
import { supabase } from "@/lib/supabase";

export function SupabaseSignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setMessage(error.message);
    else setMessage("Signed in!");
    setLoading(false);
  };

  return (
    <form onSubmit={handleSignIn} className="space-y-4">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="w-full border rounded px-3 py-2"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        className="w-full border rounded px-3 py-2"
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>
      {message && <p className="text-sm text-red-500">{message}</p>}
    </form>
  );
}


export default function SignInWithGoogle({ label = "Continue with Google" }) {
  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      },
    })
  }

  return (
    <button
      onClick={signIn}
      className={"w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3 hover:opacity-90 " +
        "transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black/20 " +
        "min-h-[44px] text-white bg-black"}
    >
      <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.9 32.6 29.5 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C33.9 6.1 29.2 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c10 0 19-7.3 19-20 0-1.3-.1-2.2-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 18.9 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C33.9 6.1 29.2 4 24 4 16.4 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.4 0 10.3-2.1 13.8-5.6l-6.4-5.2C29.3 34.7 26.8 36 24 36c-5.4 0-9.9-3.4-11.6-8.1l-6.6 5.1C9.2 39.7 16 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.6 3.7-5.5 8-11.3 8-6.6 0-12-5.4-12-12 0-6.6 5.4-12 12-12 3 0 5.7 1.1 7.8 2.9l5.7-5.7C33.9 6.1 29.2 4 24 4c-11.1 0-20 8.9-20 20s8.9 20 20 20c10 0 19-7.3 19-20 0-1.3-.1-2.2-.4-3.5z"/></svg>
      {label}
    </button>
  )
}
