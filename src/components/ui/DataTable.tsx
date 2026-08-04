/**
 * DataTable
 *
 * A generic, typed table that degrades to stacked cards on narrow viewports.
 *
 * Most students on this platform arrive on a phone. A horizontally scrolling
 * table of invoices is effectively unreadable there, so below 768px each row
 * becomes a card and each cell carries its own column label. That label is
 * supplied through a `data-label` attribute and rendered by CSS, which keeps the
 * markup a real <table> — so the header row is still announced correctly by
 * screen readers at every width.
 */

import type { ReactNode } from "react"

export type DataTableColumn<TRow> = {
	/** Column heading, and the label shown beside each cell on mobile. */
	header: string
	/** Cell content for a row. */
	cell: (row: TRow) => ReactNode
	/** Right-align and use tabular figures. Set true for money and counts. */
	numeric?: boolean
}

export type DataTableProps<TRow> = {
	columns: ReadonlyArray<DataTableColumn<TRow>>
	rows: ReadonlyArray<TRow>
	/** Stable key per row. Never use the array index. */
	rowKey: (row: TRow) => string
	/** Shown in place of the table when there are no rows. */
	emptyState?: ReactNode
	/** Accessible description of the table's contents. */
	caption?: string
}

export function DataTable<TRow>({
	columns,
	rows,
	rowKey,
	emptyState,
	caption,
}: DataTableProps<TRow>) {
	if (rows.length === 0) {
		return emptyState ? <>{emptyState}</> : null
	}

	return (
		<table className="ds-table">
			{caption ? (
				<caption
					style={{
						position: "absolute",
						width: 1,
						height: 1,
						overflow: "hidden",
						clipPath: "inset(50%)",
						whiteSpace: "nowrap",
					}}
				>
					{caption}
				</caption>
			) : null}
			<thead>
				<tr>
					{columns.map((column) => (
						<th key={column.header} scope="col">
							{column.header}
						</th>
					))}
				</tr>
			</thead>
			<tbody>
				{rows.map((row) => (
					<tr key={rowKey(row)}>
						{columns.map((column) => (
							<td
								key={column.header}
								data-label={column.header}
								className={column.numeric ? "ds-table__numeric" : undefined}
							>
								{column.cell(row)}
							</td>
						))}
					</tr>
				))}
			</tbody>
		</table>
	)
}

/** Table-shaped placeholder for the loading state. */
export function DataTableSkeleton({
	columns = 4,
	rows = 5,
}: {
	columns?: number
	rows?: number
}) {
	return (
		<div aria-hidden="true" style={{ padding: 16 }}>
			{Array.from({ length: rows }).map((_unusedRow, rowIndex) => (
				<div
					key={rowIndex}
					style={{ display: "flex", gap: 16, marginBottom: 16 }}
				>
					{Array.from({ length: columns }).map((_unusedCell, cellIndex) => (
						<span
							key={cellIndex}
							className="ds-skeleton"
							style={{ height: 12, flex: 1 }}
						/>
					))}
				</div>
			))}
		</div>
	)
}

export default DataTable
