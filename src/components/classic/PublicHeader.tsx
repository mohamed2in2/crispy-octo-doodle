import Link from "next/link";

import { LANDING } from "./landing-copy";

export function PublicHeader({ signedIn = false }: { signedIn?: boolean }) {
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

				<div className="c-pubhead__actions">
					{signedIn ? (
						<Link className="c-pubhead__cta" href="/account/home">
							{"\u062d\u0633\u0627\u0628\u064a" /* حسابي */}
						</Link>
					) : (
						<>
							<Link className="c-pubhead__login" href="/login">
								{LANDING.logIn}
							</Link>
							<Link className="c-pubhead__cta" href="/signup">
								{LANDING.signUp}
							</Link>
						</>
					)}
				</div>
			</div>
		</header>
	);
}
