type AsyncStatusProps = {
  title: string
  status: string
  progress?: number
  detail?: string
}

export function AsyncStatus({ title, status, progress, detail }: AsyncStatusProps) {
  const normalized = status.toLowerCase()
  const tone =
    normalized === 'completed' || normalized === 'matched'
      ? 'success'
      : normalized === 'failed' || normalized === 'no_match'
        ? 'danger'
        : normalized === 'needs_review'
          ? 'warning'
          : 'neutral'

  return (
    <div className={`async-status async-status-${tone}`}>
      <div className="async-status-head">
        <strong>{title}</strong>
        <span className={`badge badge-${tone}`}>{status}</span>
      </div>
      {typeof progress === 'number' ? (
        <>
          <div className="progress-bar" aria-hidden="true">
            <div className="progress-bar-fill" style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }} />
          </div>
          <p className="muted">Прогресс {progress}%</p>
        </>
      ) : null}
      {detail ? <p className="muted">{detail}</p> : null}
    </div>
  )
}
