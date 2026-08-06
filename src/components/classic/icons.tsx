import type { SVGProps } from "react";

/*
 * Inline icons.
 *
 * The repo pulls icons from a component library elsewhere, but the shell must
 * not depend on it: these render in every page's tree, and one missing named
 * export would break the build for the whole app at once. Twenty small paths
 * are cheaper than that risk.
 *
 * All inherit colour via currentColor and are aria-hidden, so the accessible
 * name always comes from the surrounding label or aria-label.
 */

export type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
	size?: number;
};

function Svg({ size = 22, ...rest }: SVGProps<SVGSVGElement> & { size?: number }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={1.8}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			focusable="false"
			{...rest}
		/>
	);
}

export function IconHome(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M3.5 10.5 12 3.5l8.5 7" />
			<path d="M5.5 9.5V20.5h13V9.5" />
			<path d="M10 20.5v-6h4v6" />
		</Svg>
	);
}

export function IconBook(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M4 4.5h7a2 2 0 0 1 2 2v13a1.6 1.6 0 0 0-1.6-1.6H4z" />
			<path d="M20 4.5h-7a2 2 0 0 0-2 2v13a1.6 1.6 0 0 1 1.6-1.6H20z" />
		</Svg>
	);
}

export function IconUsers(props: IconProps) {
	return (
		<Svg {...props}>
			<circle cx="9" cy="8" r="3.2" />
			<path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
			<path d="M16 5.3a3.2 3.2 0 0 1 0 6" />
			<path d="M17.5 14.8c2.1.6 3.5 2.3 3.5 4.6" />
		</Svg>
	);
}

export function IconUser(props: IconProps) {
	return (
		<Svg {...props}>
			<circle cx="12" cy="8" r="3.5" />
			<path d="M4.5 20.5c0-3.6 3.3-6 7.5-6s7.5 2.4 7.5 6" />
		</Svg>
	);
}

export function IconPlay(props: IconProps) {
	return (
		<Svg {...props}>
			<circle cx="12" cy="12" r="8.5" />
			<path d="M10.3 9.2l5 2.8-5 2.8z" />
		</Svg>
	);
}

export function IconWallet(props: IconProps) {
	return (
		<Svg {...props}>
			<rect x="3" y="6.5" width="18" height="12" rx="2.5" />
			<path d="M3 10.5h18" />
			<circle cx="16.5" cy="14.5" r="1.2" />
		</Svg>
	);
}

export function IconTicket(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M3 9V7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5V9a3 3 0 0 0 0 6v1.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.5V15a3 3 0 0 0 0-6z" />
			<path d="M12 8.5v7" strokeDasharray="2 2.5" />
		</Svg>
	);
}

export function IconSearch(props: IconProps) {
	return (
		<Svg size={18} {...props}>
			<circle cx="11" cy="11" r="6.5" />
			<path d="M16 16l4.5 4.5" />
		</Svg>
	);
}

export function IconBell(props: IconProps) {
	return (
		<Svg size={20} {...props}>
			<path d="M6.5 10a5.5 5.5 0 0 1 11 0c0 4 1.5 5.5 1.5 5.5H5s1.5-1.5 1.5-5.5z" />
			<path d="M10 18.5a2.2 2.2 0 0 0 4 0" />
		</Svg>
	);
}

export function IconMoon(props: IconProps) {
	return (
		<Svg size={20} {...props}>
			<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
		</Svg>
	);
}

export function IconChevronStart(props: IconProps) {
	return (
		<Svg size={18} {...props}>
			<path d="M14.5 5.5 8 12l6.5 6.5" />
		</Svg>
	);
}

export function IconChevronEnd(props: IconProps) {
	return (
		<Svg size={18} {...props}>
			<path d="M9.5 5.5 16 12l-6.5 6.5" />
		</Svg>
	);
}

export function IconWhatsapp(props: IconProps) {
	return (
		<Svg size={24} {...props}>
			<path d="M20.5 11.7a8.5 8.5 0 0 1-12.6 7.5L3.5 20.5l1.4-4.3a8.5 8.5 0 1 1 15.6-4.5z" />
			<path d="M9 9.5c0 3 2.5 5.5 5.5 5.5" />
		</Svg>
	);
}

export function IconSupport(props: IconProps) {
	return (
		<Svg size={22} {...props}>
			<path d="M6 3.5h8.5L19 8v12.5H6z" />
			<path d="M14 3.5V8h5" />
			<path d="M9 13h6M9 16.5h4" />
		</Svg>
	);
}

export function IconHelp(props: IconProps) {
	return (
		<Svg {...props}>
			<circle cx="12" cy="12" r="8.5" />
			<path d="M9.7 9.3a2.4 2.4 0 1 1 3.4 2.2c-.7.4-1.1 1-1.1 1.8" />
			<path d="M12 16.6h.01" strokeWidth={2.4} />
		</Svg>
	);
}

export function IconChart(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M4 20.5V4" />
			<path d="M4 20.5h16" />
			<path d="M8 17V12M12.5 17V8M17 17v-3.5" />
		</Svg>
	);
}

export function IconInbox(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M3.5 13.5 6 5.5h12l2.5 8v5H3.5z" />
			<path d="M3.5 13.5H9a3 3 0 0 0 6 0h5.5" />
		</Svg>
	);
}

export function IconReceipt(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M6 3.5h12v17l-3-1.6-3 1.6-3-1.6-3 1.6z" />
			<path d="M9 8h6M9 11.5h6" />
		</Svg>
	);
}

export function IconLink(props: IconProps) {
	return (
		<Svg {...props}>
			<rect x="3" y="5.5" width="18" height="13" rx="2.5" />
			<circle cx="8.5" cy="11" r="2" />
			<path d="M5 16c0-1.7 1.6-2.8 3.5-2.8S12 14.3 12 16" />
			<path d="M14.5 10h4M14.5 13.5h3" />
		</Svg>
	);
}

export function IconSparkle(props: IconProps) {
	return (
		<Svg {...props}>
			<path d="M12 3.5l1.7 4.8 4.8 1.7-4.8 1.7L12 16.5l-1.7-4.8L5.5 10l4.8-1.7z" />
			<path d="M18.5 16.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
		</Svg>
	);
}

export function IconCode(props: IconProps) {
	return (
		<Svg {...props}>
			<polyline points="16 18 22 12 16 6" />
			<polyline points="8 6 2 12 8 18" />
		</Svg>
	);
}
