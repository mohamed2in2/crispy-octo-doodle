import Link from "next/link";

import { SHELL } from "./copy";
import { IconSupport, IconWhatsapp } from "./icons";

/*
 * Footer and floating contact buttons.
 *
 * Both belong to the shell rather than to individual pages. The reference
 * platform's real advantage is that its chrome never moves; a footer that
 * appears on some pages and not others is one of the loudest "this is a
 * collection of pages" signals there is.
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

export function FloatingActions({
	whatsappHref = "https://wa.me/201000000000",
	supportHref = "/account/notifications",
}: {
	whatsappHref?: string;
	supportHref?: string;
}) {
	return (
		<div className="c-float">
			<a
				className="c-float__btn"
				data-kind="whatsapp"
				href={whatsappHref}
				target="_blank"
				rel="noopener noreferrer"
				aria-label={SHELL.whatsapp}
			>
				<IconWhatsapp />
			</a>
			<Link
				className="c-float__btn"
				data-kind="support"
				href={supportHref}
				aria-label={SHELL.support}
			>
				<IconSupport />
			</Link>
		</div>
	);
}
