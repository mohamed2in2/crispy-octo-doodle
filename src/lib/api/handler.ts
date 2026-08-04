import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { getSession, getStudentSession, type SessionUser } from "@/lib/auth";
import { forbidden, toErrorResponse, unauthorized } from "./errors";

/**
 * Route wrapper.
 *
 * Every handler in this codebase currently repeats the same preamble: open a
 * try/catch, call getSession(), return 401 if absent, check roles, and close
 * with a catch that logs and returns a generic 500. `withRoute` owns that
 * preamble so handlers contain only their actual logic, and so the error path
 * is implemented once rather than 25+ times.
 *
 * Handlers may throw any ApiError from ./errors instead of building a
 * NextResponse by hand; see ./errors for how thrown values are serialised.
 */

export type AuthMode =
  /** No session required. The handler receives `session: null`. */
  | "none"
  /** Any authenticated user. */
  | "session"
  /** Authenticated and role === "student". */
  | "student";

/** With "none" the session may be absent; otherwise it is guaranteed present. */
type SessionFor<M extends AuthMode> = M extends "none" ? SessionUser | null : SessionUser;

export type RouteOptions<M extends AuthMode> = {
  /** Defaults to "session". */
  auth?: M;
  /**
   * If set, only these roles may proceed. Checked after authentication.
   */
  allowRoles?: readonly string[];
  /**
   * Roles that are rejected with a specific message, e.g. explaining that an
   * action is for students only. Takes precedence over allowRoles.
   */
  denyRoles?: Readonly<Record<string, string>>;
  /** Label used in log lines. Defaults to the request pathname. */
  label?: string;
};

export type RouteHandlerContext<M extends AuthMode> = {
  req: NextRequest;
  /** Pre-parsed URL, so handlers don't each build their own. */
  url: URL;
  /** Correlation id — present in the server log and in any error response. */
  requestId: string;
  session: SessionFor<M>;
  /**
   * The second argument Next.js passes to the handler (route params etc.),
   * forwarded untouched. In current Next versions `params` is a Promise, so
   * await it in the handler: `const { id } = await ctx.next.params`.
   */
  next: unknown;
};

export function withRoute<M extends AuthMode = "session">(
  options: RouteOptions<M>,
  handler: (ctx: RouteHandlerContext<M>) => Promise<Response> | Response
) {
  const mode = (options.auth ?? "session") as AuthMode;

  return async function routeHandler(req: NextRequest, next: unknown): Promise<Response> {
    const requestId = randomUUID();
    const url = new URL(req.url);
    const label = options.label ?? url.pathname;

    try {
      let session: SessionUser | null = null;

      if (mode === "student") {
        session = await getStudentSession();
        // getStudentSession returns null both for "not logged in" and for
        // "logged in but not a student", so 401 is the only safe answer here.
        if (!session) throw unauthorized();
      } else if (mode === "session") {
        session = await getSession();
        if (!session) throw unauthorized();
      } else {
        // "none" — read the session opportunistically; absence is not an error.
        session = await getSession();
      }

      if (session) {
        const denyMessage = options.denyRoles?.[session.role];
        if (denyMessage) throw forbidden(denyMessage);

        if (options.allowRoles && !options.allowRoles.includes(session.role)) {
          throw forbidden();
        }
      }

      return await handler({
        req,
        url,
        requestId,
        session: session as SessionFor<M>,
        next,
      });
    } catch (error) {
      return toErrorResponse(error, requestId, label);
    }
  };
}
