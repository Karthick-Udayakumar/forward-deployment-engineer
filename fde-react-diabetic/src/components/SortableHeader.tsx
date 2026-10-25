interface SortableHeaderProps<K extends string> {
  label: string
  sortKey: K
  /** The column currently sorted by, or null when unsorted. */
  activeKey: K | null
  direction: 'asc' | 'desc'
  onSort: (key: K) => void
}

// A column header that is a real button, so it works with the keyboard and screen readers.
export function SortableHeader<K extends string>({ label, sortKey, activeKey, direction, onSort }: SortableHeaderProps<K>) {
  const active = activeKey === sortKey
  const ariaSort = active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'
  const indicator = active ? (direction === 'asc' ? '▲' : '▼') : '⇅'

  return (
    <th aria-sort={ariaSort}>
      <button type="button" className="sort-button" onClick={() => onSort(sortKey)}>
        {label}
        <span className="sort-indicator" aria-hidden="true">
          {indicator}
        </span>
      </button>
    </th>
  )
}
