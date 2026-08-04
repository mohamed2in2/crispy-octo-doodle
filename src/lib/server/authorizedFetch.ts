/**
 * Server-side fetch against this application's own API, carrying the caller's
 * session cookies.
 *
 * Server components have no ambient credentials: an unadorned `fetch` to an
 * authenticated route returns 401. This forwards the incoming cookie header so
 * the route sees the signed-in user.
 *
 * NOTE: `src/lib/financial/data.ts` still has a private copy of this logic from
 * before this module existed. It should be migrated to import from here the next
 * time that file is edited for a functional reason — rewriting it purely to
 * deduplicate would risk a regression for no user-visible gain.
 */

import { cookies, headers } from "next/headers"

/**
 * Resolves the origin for a server-to-self call.
 *
 * Prefers the incoming request's host so preview deployments and local
 * development work with no configuration, then falls back to the same env vars
 * the existing payment code reads.
 */
export async function resolveOrigin(): Promise<string> {
	try {
		const headerList = await headers()
		const host = headerList.get("x-forwarded-host") ?? headerList.get("host")
		if (host) {
			const protocol =
				headerList.get("x-forwarded-proto") ??
				(host.startsWith("localhost") || host.startsWith("127.0.0.1")
					? "http"
					: "https")
			return `${protocol}://${host}`
		}
	} catch {
		// Called outside a request scope. Fall through to configuration.
	}

	return (
		process.env.NEXT_PUBLIC_APP_URL ??
		process.env.NEXT_PUBLIC_SITE_URL ??
		"https://code-up.tech"
	)
}

/**
 * GETs a path on this application with the caller's cookies attached.
 *
 * Returns `null` instead of throwing, because a failed read on a dashboard
 * should degrade to an explained empty state rather than replace the whole page
 * with an error boundary.
 */
export async function authorizedGet(
	path: string,
): Promise<Response | null> {
	try {
		const [origin, cookieStore] = await Promise.all([
			resolveOrigin(),
			cookies(),
		])

		const cookieHeader = cookieStore
			.getAll()
			.map((entry) => `${entry.name}=${entry.value}`)
			.join("; ")

		return await fetch(`${origin}${path}`, {
			headers: cookieHeader ? { cookie: cookieHeader } : undefined,
			// Personal, per-user data must never come from a shared cache.
			cache: "no-store",
		})
	} catch {
		return null
	}
}

/**
 * As `authorizedGet`, but parses JSON and returns `null` on any failure.
 *
 * The caller supplies the expected shape. Nothing here validates it, so treat
 * every field as optional when consuming the result.
 */
export async function authorizedGetJson<T>(
	path: string,
): Promise<T | null> {
	const response = await authorizedGet(path)
	if (!response || !response.ok) {
		return null
	}

	try {
		return (await response.json()) as T
	} catch {
		return null
	}
}
