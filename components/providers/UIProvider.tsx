"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { usePref } from "@/hooks/usePref";
import type { LayoutMode, SortKey } from "@/lib/types";

const LAYOUTS = ["grid", "list"] as const;
const SORTS = ["newest", "oldest", "name", "size"] as const;

interface UIContextValue {
  query: string;
  setQuery: (value: string) => void;
  layout: LayoutMode;
  setLayout: (value: LayoutMode) => void;
  sort: SortKey;
  setSort: (value: SortKey) => void;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
}

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [layout, setLayout] = usePref<LayoutMode>("ghost-xxx:layout", "grid", LAYOUTS);
  const [sort, setSort] = usePref<SortKey>("ghost-xxx:sort", "newest", SORTS);

  const value = useMemo(
    () => ({ query, setQuery, layout, setLayout, sort, setSort, drawerOpen, setDrawerOpen }),
    [query, layout, setLayout, sort, setSort, drawerOpen],
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI(): UIContextValue {
  const context = useContext(UIContext);
  if (!context) throw new Error("useUI must be used inside <UIProvider>");
  return context;
}
