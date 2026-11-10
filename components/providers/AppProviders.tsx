"use client";

import type { ReactNode } from "react";
import { ConfirmProvider } from "./ConfirmProvider";
import { FileActionsProvider } from "./FileActionsProvider";
import { LibraryProvider } from "./LibraryProvider";
import { ToastProvider } from "./ToastProvider";
import { UIProvider } from "./UIProvider";
import { UploadProvider } from "./UploadProvider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <LibraryProvider>
          <UIProvider>
            <FileActionsProvider>
              <UploadProvider>{children}</UploadProvider>
            </FileActionsProvider>
          </UIProvider>
        </LibraryProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}
