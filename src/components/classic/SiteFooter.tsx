import Link from "next/link";

import { SHELL } from "./copy";
import { IconSparkle } from "./icons";

/*
 * Footer and the floating assistant button.
 *
 * Both belong to the shell rather than to individual pages: chrome that
 * appears on some pages and not others is the loudest "this is a collection
 * of pages" signal there is.
 *
 * The floating control used to be a pair of contact bubbles (WhatsApp and a
 * support inbox). It is now a single labelled assistant button pointing at
 * the AI study page. Two unlabelled circles in the corner is the most
 * copied chrome on the Arabic ed-tech web; a labelled pill is both more
 * legible and unmistakably not someone else's.
 */

const SOCIAL: Array<{ label: string; href: string }> = [
	{ label: SHELL.facebook, href: "https://facebook.com" },
	{ label: SHELL.instagram, href: "https://instagram.com" },
	{ label: SHELL.youtube, href: "https://youtube.com" },
	{ label: SHELL.tiktok, href: "https://tiktok.com" },
];

export function SiteFooter() {
	const year = new Date().getFullYear();

	return (
		<footer className="c-footer">
			<div className="c-footer__inner">
				<div className="c-footer__brand">
					<span className="c-footer__logo">Code-UP</span>
					<p className="c-footer__tagline">{SHELL.tagline}</p>
				</div>

				<div>
					<h2 className="c-footer__heading">{SHELL.pages}</h2>
					<ul className="c-footer__list">
						<li>
							<Link className="c-footer__link" href="/account/home">
								{SHELL.home}
							</Link>
						</li>
						<li>
							<Link className="c-footer__link" href="/courses">
								{SHELL.courses}
							</Link>
						</li>
						<li>
							<Link className="c-footer__link" href="/account/financial">
								{SHELL.financial}
							</Link>
						</li>
						<li>
							<Link className="c-footer__link" href="/terms">
								{SHELL.help}
							</Link>
						</li>
					</ul>
				</div>

				<div>
					<h2 className="c-footer__heading">{SHELL.followUs}</h2>
					<ul className="c-footer__list">
						{SOCIAL.map((item) => (
							<li key={item.label}>
								<a
									className="c-footer__link"
									href={item.href}
									target="_blank"
									rel="noopener noreferrer"
								>
									{item.label}
								</a>
							</li>
						))}
					</ul>
				</div>
			</div>

			<p className="c-footer__copy">
				{SHELL.rightsReserved} © {year}
			</p>
		</footer>
	);
}

export function FloatingAssistant({ href = "/ai-study" }: { href?: string }) {
	return (
		<Link className="c-ai-float" href={href} aria-label={SHELL.ai}>
			<IconSparkle size={20} />
			<span className="c-ai-float__label">{SHELL.ai}</span>
		</Link>
	);
}
