import type { ReactNode } from "react";

/** A template re-mounts on every navigation, which replays this entrance animation. */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="animate-page-in">{children}</div>;
}
