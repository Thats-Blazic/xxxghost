"use client";

import {
  Download,
  FastForward,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  Rewind,
  TriangleAlert,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { cn, clamp } from "@/lib/cn";
import { formatDuration } from "@/lib/format";
import { resolveDuration } from "@/lib/media";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const HIDE_DELAY = 2800;

type WebkitVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };

interface VideoPlayerProps {
  src: string;
  poster?: string | null;
  title: string;
  /** width / height of the video, used to size the player before metadata loads. */
  aspectRatio?: number;
  autoPlay?: boolean;
  onDownload?: () => void;
}

interface Flash {
  key: number;
  kind: "rewind" | "forward" | "play" | "pause";
}

function ControlButton({
  label,
  onClick,
  children,
  className,
  pressed,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        onClick();
        // Don't keep keyboard focus on the button after a mouse/touch click, so Space keeps toggling playback.
        if (event.detail > 0) event.currentTarget.blur();
      }}
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-xl text-white outline-none transition hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-violet-400 active:scale-90 sm:size-11",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function VideoPlayer({ src, poster, title, aspectRatio = 16 / 9, autoPlay = true, onDownload }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number | undefined>(undefined);
  const tapTimer = useRef<number | undefined>(undefined);
  const lastTap = useRef<{ time: number; side: "l" | "c" | "r" } | null>(null);
  const flashCounter = useRef(0);

  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [error, setError] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsShown, setControlsShown] = useState(true);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [scrubRatio, setScrubRatio] = useState<number | null>(null);
  const [hoverRatio, setHoverRatio] = useState<number | null>(null);
  const [flash, setFlash] = useState<Flash | null>(null);

  const scrubbing = scrubRatio !== null;
  const controlsVisible = controlsShown || !playing || speedOpen || scrubbing;
  const pipSupported = typeof document !== "undefined" && "pictureInPictureEnabled" in document && document.pictureInPictureEnabled;

  /* ------------------------------ controls timer ----------------------------- */

  const showControls = useCallback(() => {
    setControlsShown(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setControlsShown(false), HIDE_DELAY);
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(hideTimer.current);
      window.clearTimeout(tapTimer.current);
    },
    [],
  );

  const pulse = useCallback((kind: Flash["kind"]) => {
    flashCounter.current += 1;
    setFlash({ key: flashCounter.current, kind });
  }, []);

  /* --------------------------------- actions -------------------------------- */

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused || video.ended) {
      void video.play().catch(() => undefined);
      pulse("play");
    } else {
      video.pause();
      pulse("pause");
    }
  }, [pulse]);

  const seekTo = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    video.currentTime = clamp(time, 0, video.duration);
    setCurrent(video.currentTime);
  }, []);

  const seekBy = useCallback(
    (delta: number) => {
      const video = videoRef.current;
      if (!video) return;
      seekTo(video.currentTime + delta);
      pulse(delta < 0 ? "rewind" : "forward");
    },
    [seekTo, pulse],
  );

  const changeVolume = useCallback((next: number) => {
    const video = videoRef.current;
    if (!video) return;
    const value = clamp(next, 0, 1);
    video.volume = value;
    video.muted = value === 0;
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.muted || video.volume === 0) {
      video.muted = false;
      if (video.volume === 0) video.volume = 0.6;
    } else {
      video.muted = true;
    }
  }, []);

  const changeRate = useCallback((next: number) => {
    const video = videoRef.current;
    if (video) video.playbackRate = next;
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    const video = videoRef.current as WebkitVideo | null;
    if (!container || !video) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (container.requestFullscreen) {
        await container.requestFullscreen({ navigationUI: "hide" });
      } else if (video.webkitEnterFullscreen) {
        // iPhone Safari only supports fullscreen on the <video> element itself.
        video.webkitEnterFullscreen();
      }
    } catch {
      /* fullscreen denied */
    }
  }, []);

  const togglePip = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch {
      /* not available for this media */
    }
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  /* ------------------------------- keyboard --------------------------------- */

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable)) return;
      // A confirm / rename dialog is open above the player: leave the keyboard to it.
      if (document.querySelector('[role="dialog"][aria-modal="true"]:not([data-preview])')) return;
      const onButton = target?.closest("button, a, [role='menuitem'], [role='menuitemradio']");
      const video = videoRef.current;
      if (!video) return;

      let handled = true;
      switch (event.key) {
        case " ":
        case "k":
        case "K":
          if (onButton) return;
          togglePlay();
          break;
        case "ArrowLeft":
          seekBy(-5);
          break;
        case "ArrowRight":
          seekBy(5);
          break;
        case "j":
        case "J":
          seekBy(-10);
          break;
        case "l":
        case "L":
          seekBy(10);
          break;
        case "ArrowUp":
          changeVolume(video.volume + 0.1);
          break;
        case "ArrowDown":
          changeVolume(video.volume - 0.1);
          break;
        case "m":
        case "M":
          toggleMute();
          break;
        case "f":
        case "F":
          void toggleFullscreen();
          break;
        case "Home":
          seekTo(0);
          break;
        case "End":
          seekTo(video.duration);
          break;
        case "<":
        case ">": {
          const index = SPEEDS.indexOf(video.playbackRate);
          const next = SPEEDS[clamp((index === -1 ? 2 : index) + (event.key === ">" ? 1 : -1), 0, SPEEDS.length - 1)];
          changeRate(next);
          break;
        }
        default:
          if (/^[0-9]$/.test(event.key) && Number.isFinite(video.duration)) {
            seekTo((Number(event.key) / 10) * video.duration);
          } else {
            handled = false;
          }
      }
      if (handled) {
        event.preventDefault();
        showControls();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, seekBy, seekTo, changeVolume, toggleMute, toggleFullscreen, changeRate, showControls]);

  /* ----------------------------- video element events ----------------------- */

  const syncBuffered = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const { buffered: ranges, currentTime } = video;
    let end = 0;
    for (let i = 0; i < ranges.length; i += 1) {
      if (ranges.start(i) <= currentTime + 0.25 && ranges.end(i) >= currentTime) end = ranges.end(i);
    }
    setBuffered(end);
  }, []);

  /* ------------------------------ surface gestures -------------------------- */

  function onSurfacePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse") {
      if (event.button === 0) togglePlay();
      showControls();
      return;
    }
    // Touch / pen: single tap toggles controls, double tap on the sides skips ±10s.
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const side = x < 0.35 ? "l" : x > 0.65 ? "r" : "c";
    const now = Date.now();
    const previous = lastTap.current;

    if (previous && now - previous.time < 320 && previous.side === side) {
      window.clearTimeout(tapTimer.current);
      lastTap.current = null;
      if (side === "c") togglePlay();
      else seekBy(side === "l" ? -10 : 10);
      showControls();
      return;
    }

    lastTap.current = { time: now, side };
    window.clearTimeout(tapTimer.current);
    tapTimer.current = window.setTimeout(() => {
      lastTap.current = null;
      setControlsShown((shown) => {
        if (shown) window.clearTimeout(hideTimer.current);
        return !shown;
      });
      if (!videoRef.current?.paused) {
        window.clearTimeout(hideTimer.current);
        hideTimer.current = window.setTimeout(() => setControlsShown(false), HIDE_DELAY + 1200);
      }
    }, 320);
  }

  /* ------------------------------- seek bar --------------------------------- */

  const ratioFromEvent = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return clamp((event.clientX - rect.left) / rect.width, 0, 1);
  };

  const progressRatio = duration > 0 ? clamp(current / duration, 0, 1) : 0;
  const shownRatio = scrubRatio ?? progressRatio;
  const bufferedRatio = duration > 0 ? clamp(buffered / duration, 0, 1) : 0;
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div
      ref={containerRef}
      onMouseMove={showControls}
      className={cn(
        "relative flex select-none items-center justify-center overflow-hidden bg-black text-white",
        fullscreen ? "size-full rounded-none" : "max-h-full max-w-full rounded-none sm:rounded-2xl sm:shadow-[0_30px_90px_-20px_rgb(139_92_246/0.35)] sm:ring-1 sm:ring-white/10",
        !controlsVisible && playing && "cursor-none",
      )}
      style={
        fullscreen
          ? undefined
          : { aspectRatio, width: `min(100%, calc((100dvh - 9.5rem) * ${aspectRatio}))` }
      }
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster ?? undefined}
        autoPlay={autoPlay}
        playsInline
        preload="metadata"
        aria-label={title}
        className="size-full bg-black object-contain"
        onLoadedMetadata={(event) => {
          const video = event.currentTarget;
          if (Number.isFinite(video.duration)) {
            setDuration(video.duration);
          } else {
            void resolveDuration(video).then((resolved) => resolved && setDuration(resolved));
          }
          setWaiting(false);
        }}
        onDurationChange={(event) => {
          if (Number.isFinite(event.currentTarget.duration)) setDuration(event.currentTarget.duration);
        }}
        onTimeUpdate={(event) => {
          if (!scrubbing) setCurrent(event.currentTarget.currentTime);
          syncBuffered();
        }}
        onProgress={syncBuffered}
        onPlay={() => {
          setPlaying(true);
          showControls();
        }}
        onPause={() => {
          setPlaying(false);
          setControlsShown(true);
        }}
        onEnded={() => setPlaying(false)}
        onWaiting={() => setWaiting(true)}
        onSeeking={() => setWaiting(true)}
        onCanPlay={() => setWaiting(false)}
        onPlaying={() => setWaiting(false)}
        onVolumeChange={(event) => {
          setVolume(event.currentTarget.volume);
          setMuted(event.currentTarget.muted);
        }}
        onRateChange={(event) => setRate(event.currentTarget.playbackRate)}
        onError={() => {
          setError(true);
          setWaiting(false);
        }}
      />

      {/* Gesture surface (below the controls) */}
      <div className="absolute inset-0 touch-manipulation" onPointerUp={onSurfacePointerUp} onDoubleClick={() => void toggleFullscreen()} />

      {/* Skip / play indicators */}
      {flash && (
        <div
          key={flash.key}
          onAnimationEnd={() => setFlash(null)}
          className={cn(
            "pointer-events-none absolute top-1/2 flex size-20 -translate-y-1/2 animate-flash flex-col items-center justify-center rounded-full bg-black/55 backdrop-blur-sm",
            flash.kind === "rewind" && "left-[12%]",
            flash.kind === "forward" && "right-[12%]",
            (flash.kind === "play" || flash.kind === "pause") && "left-1/2 -translate-x-1/2",
          )}
        >
          {flash.kind === "rewind" && (
            <>
              <Rewind className="size-7 fill-white" />
              <span className="mt-0.5 text-[11px] font-semibold">10s</span>
            </>
          )}
          {flash.kind === "forward" && (
            <>
              <FastForward className="size-7 fill-white" />
              <span className="mt-0.5 text-[11px] font-semibold">10s</span>
            </>
          )}
          {flash.kind === "play" && <Play className="ml-1 size-8 fill-white" />}
          {flash.kind === "pause" && <Pause className="size-8 fill-white" />}
        </div>
      )}

      {waiting && !error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader2 className="size-12 animate-spin text-white/90 drop-shadow-lg" />
        </div>
      )}

      {!playing && !waiting && !error && !flash && (
        <button
          type="button"
          aria-label="Play"
          onClick={togglePlay}
          className="absolute left-1/2 top-1/2 flex size-[72px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-violet-500/90 text-white shadow-[0_0_50px_rgb(139_92_246/0.7)] outline-none transition hover:scale-105 hover:bg-violet-400 focus-visible:ring-4 focus-visible:ring-violet-300/50 active:scale-95"
        >
          <Play className="ml-1 size-8 fill-current" />
        </button>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 p-6 text-center">
          <TriangleAlert className="size-10 text-amber-400" />
          <p className="text-base font-medium">This video can&apos;t be played in your browser</p>
          <p className="max-w-sm text-sm text-zinc-400">The format or codec isn&apos;t supported here. The original file is safe, you can still download it.</p>
          {onDownload && (
            <button
              type="button"
              onClick={onDownload}
              className="mt-1 inline-flex h-11 items-center gap-2 rounded-xl bg-violet-500 px-5 text-sm font-medium transition hover:bg-violet-400"
            >
              <Download className="size-4" />
              Download original
            </button>
          )}
        </div>
      )}

      {/* Speed menu backdrop */}
      {speedOpen && <div className="absolute inset-0 z-10" onPointerDown={() => setSpeedOpen(false)} />}

      {/* Controls */}
      {!error && (
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-14 transition-opacity duration-300 sm:px-4 sm:pb-3",
            controlsVisible ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          {/* Timeline */}
          <div
            ref={barRef}
            role="slider"
            tabIndex={0}
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={Math.round(duration) || 0}
            aria-valuenow={Math.round(current)}
            aria-valuetext={`${formatDuration(current)} of ${formatDuration(duration)}`}
            className="group/seek relative mx-1 flex h-7 cursor-pointer touch-none items-center outline-none sm:mx-0"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              const ratio = ratioFromEvent(event);
              setScrubRatio(ratio);
              seekTo(ratio * duration);
            }}
            onPointerMove={(event) => {
              const ratio = ratioFromEvent(event);
              setHoverRatio(ratio);
              if (scrubbing) {
                setScrubRatio(ratio);
                seekTo(ratio * duration);
              }
            }}
            onPointerUp={() => setScrubRatio(null)}
            onPointerCancel={() => setScrubRatio(null)}
            onPointerLeave={() => setHoverRatio(null)}
          >
            <div className="relative h-1 w-full rounded-full bg-white/25 transition-all group-hover/seek:h-1.5 group-focus-visible/seek:h-1.5">
              <div className="absolute inset-y-0 left-0 rounded-full bg-white/35" style={{ width: `${bufferedRatio * 100}%` }} />
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400"
                style={{ width: `${shownRatio * 100}%` }}
              />
              <div
                className={cn(
                  "absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_12px_rgb(167_139_250)] transition-transform",
                  scrubbing ? "scale-125" : "scale-0 group-hover/seek:scale-100 group-focus-visible/seek:scale-100 max-sm:scale-100",
                )}
                style={{ left: `${shownRatio * 100}%` }}
              />
            </div>
            {hoverRatio !== null && !scrubbing && duration > 0 && (
              <div
                className="pointer-events-none absolute bottom-6 -translate-x-1/2 rounded-md bg-black/80 px-2 py-1 font-mono text-xs tabular-nums max-sm:hidden"
                style={{ left: `${hoverRatio * 100}%` }}
              >
                {formatDuration(hoverRatio * duration)}
              </div>
            )}
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1">
            <ControlButton label={playing ? "Pause" : "Play"} onClick={togglePlay}>
              {playing ? <Pause className="size-5 fill-current sm:size-6" /> : <Play className="ml-0.5 size-5 fill-current sm:size-6" />}
            </ControlButton>

            <ControlButton label="Back 10 seconds" onClick={() => seekBy(-10)} className="max-sm:hidden">
              <Rewind className="size-5" />
            </ControlButton>
            <ControlButton label="Forward 10 seconds" onClick={() => seekBy(10)} className="max-sm:hidden">
              <FastForward className="size-5" />
            </ControlButton>

            <div className="group/vol flex items-center max-sm:hidden">
              <ControlButton label={muted ? "Unmute" : "Mute"} onClick={toggleMute}>
                <VolumeIcon className="size-5" />
              </ControlButton>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={muted ? 0 : volume}
                aria-label="Volume"
                onChange={(event) => changeVolume(Number(event.target.value))}
                onPointerUp={(event) => event.currentTarget.blur()}
                className="h-1 w-0 cursor-pointer accent-violet-400 opacity-0 transition-all duration-200 group-hover/vol:mr-2 group-hover/vol:w-20 group-hover/vol:opacity-100 focus-visible:mr-2 focus-visible:w-20 focus-visible:opacity-100"
              />
            </div>

            <span className="ml-1.5 whitespace-nowrap font-mono text-xs tabular-nums text-white/90 sm:ml-2 sm:text-[13px]">
              {formatDuration(scrubRatio !== null ? scrubRatio * duration : current)}
              <span className="text-white/50"> / {formatDuration(duration)}</span>
            </span>

            <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
              <div className="relative">
                <ControlButton label="Playback speed" onClick={() => setSpeedOpen((open) => !open)} pressed={speedOpen} className="w-auto min-w-10 px-2 font-mono text-[13px] font-semibold sm:min-w-11">
                  {rate}×
                </ControlButton>
                {speedOpen && (
                  <div
                    role="menu"
                    className="absolute bottom-full right-0 mb-2 w-28 animate-scale-in overflow-hidden rounded-xl border border-white/10 bg-black/90 p-1 shadow-2xl backdrop-blur-xl [transform-origin:bottom_right]"
                  >
                    {SPEEDS.map((speed) => (
                      <button
                        key={speed}
                        type="button"
                        role="menuitemradio"
                        aria-checked={rate === speed}
                        onClick={() => {
                          changeRate(speed);
                          setSpeedOpen(false);
                        }}
                        className={cn(
                          "flex h-9 w-full items-center justify-between rounded-lg px-3 text-sm outline-none transition hover:bg-white/10 focus-visible:bg-white/10",
                          rate === speed && "bg-violet-500/25 text-violet-200",
                        )}
                      >
                        {speed === 1 ? "Normal" : `${speed}×`}
                        {rate === speed && <span className="size-1.5 rounded-full bg-violet-300" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {pipSupported && (
                <ControlButton label="Picture in picture" onClick={() => void togglePip()} className="max-sm:hidden">
                  <PictureInPicture2 className="size-5" />
                </ControlButton>
              )}
              <ControlButton label={fullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={() => void toggleFullscreen()}>
                {fullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
              </ControlButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
