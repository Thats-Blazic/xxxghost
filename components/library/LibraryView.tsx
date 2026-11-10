"use client";

import { ArrowRight, SearchX, TriangleAlert, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { PreviewModal } from "@/components/preview/PreviewModal";
import { useFileActions } from "@/components/providers/FileActionsProvider";
import { useLibrary } from "@/components/providers/LibraryProvider";
import { useUI } from "@/components/providers/UIProvider";
import { useUpload } from "@/components/providers/UploadProvider";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import { formatBytes, pluralize } from "@/lib/format";
import { belongsToView, sortItems } from "@/lib/sort";
import type { MediaMeta, ViewKey } from "@/lib/types";
import { MediaCard } from "./MediaCard";
import { MediaRow } from "./MediaRow";
import { Overview } from "./Overview";
import { SelectionBar } from "./SelectionBar";
import { Toolbar, type KindFilter } from "./Toolbar";
import { FIXED_KIND_VIEWS, VIEW_CONFIG } from "./views";

const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6";

interface PreviewState {
  id: string;
  ids: string[];
}

export function LibraryView({ view }: { view: ViewKey }) {
  const { items, status, errorMessage } = useLibrary();
  const { query, setQuery, sort, setSort, layout } = useUI();
  const actions = useFileActions();
  const { setOpen: openUpload } = useUpload();
  const config = VIEW_CONFIG[view];

  const [kind, setKind] = useState<KindFilter>("all");
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const [preview, setPreview] = useState<PreviewState | null>(null);

  const loading = status === "loading";
  const kindFilterVisible = !FIXED_KIND_VIEWS.has(view);
  const trimmedQuery = query.trim();

  const base = useMemo(() => {
    const inView = items.filter((item) => belongsToView(item, view));
    return view === "recent" ? sortItems(inView, "newest").slice(0, 30) : inView;
  }, [items, view]);

  const visible = useMemo(() => {
    let list = base;
    if (kindFilterVisible && kind !== "all") list = list.filter((item) => item.kind === kind);
    if (trimmedQuery) {
      const needle = trimmedQuery.toLowerCase();
      list = list.filter((item) => item.name.toLowerCase().includes(needle));
    }
    return sortItems(list, sort);
  }, [base, kind, kindFilterVisible, trimmedQuery, sort]);

  const recentStrip = useMemo(
    () => (view === "all" ? sortItems(items.filter((item) => belongsToView(item, "all")), "newest").slice(0, 6) : []),
    [items, view],
  );

  const selectedItems = useMemo(() => visible.filter((item) => selectedIds.has(item.id)), [visible, selectedIds]);
  const totalBytes = useMemo(() => visible.reduce((sum, item) => sum + item.size, 0), [visible]);

  const exitSelection = useCallback(() => {
    setSelecting(false);
    setSelectedIds(new Set());
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelecting(true);
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const openPreview = useCallback((id: string, ids: string[]) => setPreview({ id, ids }), []);

  const handleRemoved = useCallback((id: string) => {
    setPreview((current) => {
      if (!current) return current;
      const index = current.ids.indexOf(id);
      const ids = current.ids.filter((candidate) => candidate !== id);
      if (ids.length === 0) return null;
      return { id: ids[Math.min(index, ids.length - 1)], ids };
    });
  }, []);

  function renderItem(item: MediaMeta, ids: string[], selectable = true) {
    const props = {
      item,
      selected: selectedIds.has(item.id),
      selecting,
      selectable,
      onOpen: () => openPreview(item.id, ids),
      onToggleSelect: () => toggleSelect(item.id),
      onRemoved: () => handleRemoved(item.id),
    };
    return layout === "grid" ? <MediaCard key={item.id} {...props} /> : <MediaRow key={item.id} {...props} />;
  }

  const visibleIds = visible.map((item) => item.id);
  const isFiltering = trimmedQuery !== "" || kind !== "all";
  const uploadButton = (
    <Button variant="primary" size="lg" icon={<Upload className="size-[18px]" />} onClick={() => openUpload(true)}>
      Upload files
    </Button>
  );

  let content: React.ReactNode;
  if (status === "error") {
    content = (
      <EmptyState
        icon={TriangleAlert}
        title="Couldn't reach your cloud storage"
        description={`${errorMessage ?? "The request failed."} Check your connection and try again.`}
        action={<Button onClick={() => window.location.reload()}>Reload</Button>}
      />
    );
  } else if (loading) {
    content = (
      <div className={layout === "grid" ? GRID : "flex flex-col gap-2"}>
        {Array.from({ length: layout === "grid" ? 12 : 6 }, (_, i) => (
          <Skeleton key={i} className={layout === "grid" ? "aspect-[4/4.6] rounded-2xl" : "h-[76px] rounded-2xl"} />
        ))}
      </div>
    );
  } else if (base.length === 0) {
    content = (
      <EmptyState
        icon={config.icon}
        title={config.emptyTitle}
        description={config.emptyDescription}
        action={view === "trash" || view === "favorites" ? undefined : uploadButton}
      />
    );
  } else if (visible.length === 0) {
    content = (
      <EmptyState
        icon={SearchX}
        title="No matching files"
        description={trimmedQuery ? `Nothing found for “${trimmedQuery}”. Check the spelling or try another name.` : "No files match this filter."}
        action={
          <Button
            onClick={() => {
              setQuery("");
              setKind("all");
            }}
          >
            Clear search & filters
          </Button>
        }
      />
    );
  } else {
    content = (
      <div className={layout === "grid" ? GRID : "flex flex-col gap-2"}>
        {visible.map((item, index) => (
          <div key={item.id} className="min-w-0 animate-rise" style={{ animationDelay: `${Math.min(index, 14) * 28}ms` }}>
            {renderItem(item, visibleIds)}
          </div>
        ))}
      </div>
    );
  }

  const subtitle = loading
    ? "Opening your vault…"
    : `${pluralize(visible.length, "file")} · ${formatBytes(totalBytes)}${isFiltering ? " (filtered)" : ""}`;

  return (
    <div className="space-y-6 lg:space-y-8">
      {view === "all" ? (
        <>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Your <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">vault</span>
            </h1>
            <p className="mt-1.5 text-sm text-zinc-500 sm:text-base">Private photos and videos, stored online and available on every device.</p>
          </div>
          <Overview items={items} loading={loading} />

          {!loading && recentStrip.length > 0 && !trimmedQuery && (
            <section aria-label="Recently uploaded" className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-tight">Recently uploaded</h2>
                <Link href="/recent" className="group inline-flex items-center gap-1 text-sm text-violet-300 hover:text-violet-200">
                  View all
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
              <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
                {recentStrip.map((item) => (
                  <div key={item.id} className="w-44 shrink-0 snap-start sm:w-52">
                    <MediaCard
                      item={item}
                      selected={false}
                      selecting={false}
                      selectable={false}
                      onOpen={() => openPreview(item.id, recentStrip.map((entry) => entry.id))}
                      onToggleSelect={() => undefined}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              <config.icon className="size-7 text-violet-300 sm:size-8" />
              {config.title}
            </h1>
            <p className="mt-1.5 text-sm text-zinc-500 sm:text-base">{subtitle}</p>
          </div>
          {view === "trash" && base.length > 0 && (
            <Button variant="danger" icon={<Trash2 className="size-4" />} onClick={() => void actions.emptyTrash()}>
              Empty Trash
            </Button>
          )}
        </div>
      )}

      {view === "trash" && base.length > 0 && (
        <p className="rounded-2xl border border-amber-500/20 bg-amber-500/6 px-4 py-3 text-sm leading-relaxed text-amber-200/80">
          Files in Trash still take up space. Restore them, or delete them permanently to free storage.
        </p>
      )}

      <section aria-label={config.title} className="space-y-4">
        {view === "all" && (
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">All files</h2>
              <p className="mt-0.5 text-sm text-zinc-500">{subtitle}</p>
            </div>
          </div>
        )}

        {(base.length > 0 || loading) && status !== "error" && (
          <Toolbar
            showKindFilter={kindFilterVisible}
            kind={kind}
            onKindChange={setKind}
            sort={sort}
            onSortChange={setSort}
            selecting={selecting}
            onToggleSelecting={() => (selecting ? exitSelection() : setSelecting(true))}
            canSelect={!loading && visible.length > 0}
          />
        )}

        <div className={cn(selecting && "pb-24")}>{content}</div>
      </section>

      {selecting && (
        <SelectionBar
          selected={selectedItems}
          total={visible.length}
          inTrash={view === "trash"}
          onSelectAll={() => setSelectedIds(new Set(visibleIds))}
          onClear={() => setSelectedIds(new Set())}
          onDone={exitSelection}
        />
      )}

      {preview && (
        <PreviewModal
          ids={preview.ids}
          currentId={preview.id}
          onNavigate={(id) => setPreview((current) => (current ? { ...current, id } : current))}
          onClose={() => setPreview(null)}
          onRemoved={handleRemoved}
        />
      )}
    </div>
  );
}
