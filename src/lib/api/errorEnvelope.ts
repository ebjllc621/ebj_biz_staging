import { ZodError } from "zod";

export type ErrorEnvelope<T = unknown> = {
  code: string;        // machine code, e.g., AUTH_INVALID_INPUT
  message: string;     // human-safe, non-enumerating text
  details?: T;         // optional, redacted/normalized details
};

/** Normalize Zod issues into a compact detail array (no raw paths on prod). */
export function zodIssues(e: ZodError): Array<{ path: string; code: string }>{
  return e.issues.map((i) => ({
    path: i.path.join("."),
    code: i.code
  }));
}

export function fromZod(e: ZodError, code = "AUTH_INVALID_INPUT"): ErrorEnvelope {
  return { code, message: "Invalid input.", details: zodIssues(e) };
}

export function fromUnknown(e: unknown, code = "AUTH_UNEXPECTED_ERROR"): ErrorEnvelope {
  if (e instanceof ZodError) return fromZod(e);
  return { code, message: "Request failed.", details: undefined };
}

/** For handlers to send consistent JSON responses */
export function toResponse(status: number, envelope: ErrorEnvelope) {
  return new Response(JSON.stringify(envelope), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}