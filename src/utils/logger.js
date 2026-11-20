export function logError(scope, error, extra = null) {
  const message = error?.message || String(error);
  if (__DEV__) {
    console.warn(`[Armutra:${scope}] ${message}`, extra || "");
  }
}
