/**
 * Penghubung kecil antara penyimpanan lokal, mesin sinkronisasi, dan UI
 * (menghindari import melingkar). Juga memberi tahu tab lain lewat BroadcastChannel.
 */
type Listener = () => void;

const dataListeners = new Set<Listener>();
let writeHook: (() => void) | null = null;
let remoteHook: (() => void) | null = null;
let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (channel || typeof BroadcastChannel === "undefined") return channel;
  channel = new BroadcastChannel("lucibook-offline");
  channel.onmessage = () => {
    // Tab lain mengubah data lokal -> segarkan tampilan di tab ini.
    remoteHook?.();
    emitDataChanged();
  };
  return channel;
}

/** Berlangganan perubahan data lokal yang TIDAK berasal dari mutasi di tab ini (sinkronisasi / tab lain). */
export function onDataChanged(cb: Listener): () => void {
  getChannel();
  dataListeners.add(cb);
  return () => dataListeners.delete(cb);
}

export function emitDataChanged() {
  dataListeners.forEach((cb) => cb());
}

/** Dipanggil setelah menulis data lokal: jadwalkan sinkronisasi + beri tahu tab lain. */
export function afterLocalWrite() {
  getChannel()?.postMessage({ t: "changed" });
  writeHook?.();
}

/** Dipanggil setelah sinkronisasi mengubah data lokal. */
export function afterSyncWrite() {
  getChannel()?.postMessage({ t: "changed" });
  emitDataChanged();
}

export function setWriteHook(fn: (() => void) | null) {
  writeHook = fn;
}

export function setRemoteChangeHook(fn: (() => void) | null) {
  remoteHook = fn;
}
