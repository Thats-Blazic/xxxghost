"use client";

import { KeyRound, Loader2, Lock, TriangleAlert } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useLibrary } from "@/components/providers/LibraryProvider";
import { Button } from "@/components/ui/Button";
import { Logo } from "./Logo";

/** Full-screen lock / setup screen. Renders nothing while the vault is open. */
export function VaultGate() {
  const { status } = useLibrary();
  if (status !== "locked" && status !== "unconfigured") return null;

  return (
    <div className="fixed inset-0 z-[60] flex animate-fade-in items-center justify-center overflow-y-auto bg-[#080808] p-4">
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 size-[560px] -translate-x-1/2 rounded-full bg-violet-700/20 blur-[140px]" />
      <div className="relative w-full max-w-md animate-scale-in rounded-3xl border border-line bg-surface/90 p-6 shadow-2xl shadow-black/60 backdrop-blur-xl sm:p-8">
        <Logo />
        {status === "locked" ? <LockForm /> : <SetupNotice />}
      </div>
    </div>
  );
}

function LockForm() {
  const { unlock } = useLibrary();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    try {
      await unlock(password);
    } catch (caught) {
      setError(caught instanceof Error && caught.message ? caught.message : "Something went wrong.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-8">
      <span className="flex size-12 items-center justify-center rounded-2xl border border-violet-500/30 bg-violet-500/10">
        <Lock className="size-5 text-violet-300" />
      </span>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">Your vault is locked</h1>
      <p className="mt-2 text-sm text-zinc-400">Enter your password to see your files. They are stored online and open on any device.</p>

      <label htmlFor="vault-password" className="sr-only">
        Password
      </label>
      <div className="relative mt-6">
        <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
        <input
          id="vault-password"
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          className="h-12 w-full rounded-xl border border-line bg-raised pl-10 pr-4 text-base outline-none transition placeholder:text-zinc-600 focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20"
        />
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="mt-4 w-full" disabled={!password || busy}>
        {busy && <Loader2 className="size-4 animate-spin" />}
        Unlock
      </Button>
    </form>
  );
}

function SetupNotice() {
  const { missingConfig, reload } = useLibrary();
  return (
    <div className="mt-8">
      <span className="flex size-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10">
        <TriangleAlert className="size-5 text-amber-400" />
      </span>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">Cloud storage isn&apos;t set up yet</h1>
      <p className="mt-2 text-sm text-zinc-400">Add these environment variables to your Vercel project, then redeploy:</p>
      <ul className="mt-4 space-y-2">
        {missingConfig.map((name) => (
          <li key={name} className="rounded-lg border border-line bg-raised px-3 py-2 font-mono text-xs text-violet-200">
            {name}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-zinc-500">
        <span className="font-mono">BLOB_READ_WRITE_TOKEN</span> is added automatically when you create a Blob store under Vercel → Storage and connect it
        to this project. <span className="font-mono">VAULT_PASSWORD</span> is any password you choose.
      </p>
      <Button variant="secondary" className="mt-5 w-full" onClick={reload}>
        Check again
      </Button>
    </div>
  );
}
