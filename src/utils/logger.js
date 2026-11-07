export function logError(scope, error, extra = null) {
  const message = error?.message || String(error);
  const stack = error?.stack;
  console.error(`[Armutra:${scope}] ${message}`, {
    extra,
    stack,
    error,
  });
}
