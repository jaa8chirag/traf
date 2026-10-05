import type { FormState } from "@/lib/form-state";

export function FormMessages({ state }: { state: FormState }) {
  return (
    <>
      {state.error && (
        <p role="alert" className="whitespace-pre-line rounded-xl bg-danger-bg px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="rounded-xl bg-success-bg px-4 py-3 text-sm text-success">
          {state.message}
        </p>
      )}
    </>
  );
}

/** Reads a submitted value back out of a FormState, falling back to the stored value. */
export function pick(state: FormState, key: string, fallback = ""): string {
  const v = state.values?.[key];
  return typeof v === "string" ? v : fallback;
}
