/** Error yang dibuat oleh lapisan data lokal (bentuk pesannya mengikuti pesan backend). */
export class LocalError extends Error {
  readonly isLocalError = true;
  constructor(message: string, public status = 400) {
    super(message);
    this.name = "LocalError";
  }
}

export function isLocalError(err: unknown): err is LocalError {
  return !!err && typeof err === "object" && (err as { isLocalError?: boolean }).isLocalError === true;
}
