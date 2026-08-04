/**
 * PageHeader
 *
 * Every page in the financial area opens with this, in this order: title,
 * description, actions. The description is required, not optional — a page that
 * cannot explain its own purpose in one sentence is usually a page doing two
 * jobs and should be split.
 */

import type { ReactNode } from "react"

export type PageHeaderProps = {
	title: string
	/** Why this page exists, in the student's words. Required by design. */
	description: string
	/** Primary and secondary actions for the page. */
	actions?: ReactNode
	/** Breadcrumb trail, rendered above the title. */
	breadcrumbs?: ReactNode
}

export function PageHeader({
	title,
	description,
	actions,
	breadcrumbs,
}: PageHeaderProps) {
	return (
		<header className="ds-page-header">
			<div>
				{breadcrumbs ? <div>{breadcrumbs}</div> : null}
				<h1 className="ds-page-header__title">{title}</h1>
				<p className="ds-page-header__description">{description}</p>
			</div>
			{actions ? (
				<div className="ds-page-header__actions">{actions}</div>
			) : null}
		</header>
	)
}

export default PageHeader
