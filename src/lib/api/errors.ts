import { NextResponse } from "next/server";

/**
 * An error that is safe to show to the caller.
 *
 * Anything thrown that is NOT an ApiError is treated as unexpected: it gets
 * logged in full server-side and the client receives a generic message plus a
 * request id. This is the point of the class — it makes "safe to expose" an
 * explicit decision at the throw site instead of relying on every catch block
 * to remember not to forward `error.message`.
 */
export class ApiError extends Error {
  readonly status: number;
  /** Machine-readable code for the client; never contains internal detail. */
  readonly code: string;
  /** Arabic message shown to the user. */
  readonly publicMessage: string;

  constructor(status: number, code: string, publicMessage: string, internalMessage?: string) {
    super(internalMessage ?? publicMessage);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.publicMessage = publicMessage;
  }
}

/*
 * Constructors for the cases that already recur across the API surface.
 * Default messages match the Arabic strings currently used in the handlers so
 * that migrating a route does not change what users see.
 */

export const unauthorized = (message = "\u064a\u062c\u0628 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0623\u0648\u0644\u0627\u064b") =>
  new ApiError(401, "UNAUTHORIZED", message);

export const forbidden = (message = "\u063a\u064a\u0631 \u0645\u0635\u0631\u062d") =>
  new ApiError(403, "FORBIDDEN", message);

export const notFound = (message = "\u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f") =>
  new ApiError(404, "NOT_FOUND", message);

export const badRequest = (message = "\u0628\u064a\u0627\u0646\u0627\u062a \u0646\u0627\u0642\u0635\u0629") =>
  new ApiError(400, "BAD_REQUEST", message);

export const conflict = (message = "\u0647\u0630\u0627 \u0627\u0644\u0625\u062c\u0631\u0627\u0621 \u063a\u064a\u0631 \u0645\u062a\u0627\u062d \u062d\u0627\u0644\u064a\u0627\u064b") =>
  new ApiError(409, "CONFLICT", message);

export const tooManyRequests = (message: string) =>
  new ApiError(429, "RATE_LIMITED", message);

/** The generic message returned for any unexpected failure. */
export const INTERNAL_MESSAGE = "\u062d\u062f\u062b \u062e\u0637\u0623 \u062f\u0627\u062e\u0644\u064a";

export type ErrorBody = {
  error: string;
  code: string;
  /** Correlation id — give this to support to find the matching server log. */
  requestId: string;
};

/**
 * Convert a thrown value into a response.
 *
 * ApiError -> its own status and public message.
 * Anything else -> 500 with a generic message. The real error is logged with
 * the request id so it stays diagnosable without being disclosed.
 */
export function toErrorResponse(error: unknown, requestId: string, routeLabel: string) {
  if (error instanceof ApiError) {
    // Client errors are expected traffic; log at a low level and without a stack.
    if (error.status >= 500) {
      console.error(`[${routeLabel}] ${requestId} ApiError:`, error);
    }
    return NextResponse.json<ErrorBody>(
      { error: error.publicMessage, code: error.code, requestId },
      { status: error.status }
    );
  }

  // Unexpected: log everything, disclose nothing.
  console.error(`[${routeLabel}] ${requestId} unhandled error:`, error);

  return NextResponse.json<ErrorBody>(
    { error: INTERNAL_MESSAGE, code: "INTERNAL", requestId },
    { status: 500 }
  );
}
