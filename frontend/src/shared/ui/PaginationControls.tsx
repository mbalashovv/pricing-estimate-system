type PaginationControlsProps = {
  count: number
  page: number
  pageSize?: number
  hasNext: boolean
  hasPrevious: boolean
  loading?: boolean
  onPageChange: (page: number) => void
}

export function PaginationControls({
  count,
  page,
  pageSize = 20,
  hasNext,
  hasPrevious,
  loading = false,
  onPageChange,
}: PaginationControlsProps) {
  const start = count === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, count)

  return (
    <div className="pagination-bar">
      <p className="muted">
        {count === 0 ? 'Нет записей' : `Показано ${start}-${end} из ${count}`}
      </p>

      <div className="button-row">
        <button
          className="button"
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrevious || loading}
        >
          Назад
        </button>
        <span className="page-chip">Страница {page}</span>
        <button
          className="button"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNext || loading}
        >
          Далее
        </button>
      </div>
    </div>
  )
}
