import { Ghost } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center">
      <Ghost className="size-16 text-violet-300" />
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Nothing here</h1>
      <p className="mt-2 text-zinc-400">This page vanished like a ghost.</p>
      <Link
        href="/"
        className="mt-8 inline-flex h-11 items-center rounded-xl bg-gradient-to-b from-violet-500 to-violet-600 px-5 text-sm font-medium shadow-glow transition hover:from-violet-400 hover:to-violet-500"
      >
        Back to your vault
      </Link>
    </div>
  );
}
