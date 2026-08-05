import Link from "next/link";

import { LANDING } from "./landing-copy";

/*
 * The public header.
 *
 * The landing page previously had no header at all: a visitor landed on a
 * bare hero with no logo, no way to log in, and no way to browse. Every
 * comparable platform puts those three things across the top, and their
 * absence was the single biggest thing making this page feel unfinished.
 *
 * Server component. The signed-in shell owns the theme toggle because it
 * needs a client boundary for it; adding one here just for a moon icon would
 * ship React to a page whose whole job is to load fast and be indexed.
 */

export function PublicHeader() {
	return (
		<header className="c-pubhead">
			<div className="c-pubhead__inner">
				<Link className="c-pubhead__brand" href="/">
					Code-UP
				</Link>

				<nav className="c-pubhead__nav" aria-label={LANDING.courses}>
					<Link className="c-pubhead__link" href="/courses">
						{LANDING.courses}
					</Link>
				</nav>

				{/*
				 * One filled button and one quiet one. The pair that used to sit
				 * in the hero were both full-width outlined boxes, which read as
				 * two empty text fields rather than as a choice.
				 */}
				<div className="c-pubhead__actions">
					<Link className="c-pubhead__login" href="/login">
						{LANDING.logIn}
					</Link>
					<Link className="c-pubhead__cta" href="/signup">
						{LANDING.signUp}
					</Link>
				</div>
			</div>
		</header>
	);
}
