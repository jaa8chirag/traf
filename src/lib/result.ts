/** Service-layer result: expected failures are values, not exceptions. */
export type Result<T = void> =
  | { ok: true; value: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const fail = (error: string, fieldErrors?: Record<string, string>): Result<never> => ({
  ok: false,
  error,
  fieldErrors,
});
