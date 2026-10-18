"use client";

import { useSyncExternalStore } from "react";
import { getServerSyncStatus, getSyncStatus, subscribeSync, type SyncStatus } from "./sync";

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(subscribeSync, getSyncStatus, getServerSyncStatus);
}
