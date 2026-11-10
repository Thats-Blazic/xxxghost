/**
 * Starts a browser download from a URL. Cloud storage download URLs are served with
 * `Content-Disposition: attachment`, so the file is saved instead of opened.
 */
export function startDownload(url: string, filename: string): void {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
