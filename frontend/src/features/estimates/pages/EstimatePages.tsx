import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppLayout } from '../../../app/layouts/AppLayout'
import { navigate } from '../../../app/router/router'
import { formatDateTime, formatNumber, statusTone } from '../../../shared/lib/format'
import type {
  CatalogItem,
  EstimateItem,
  ExcelPreviewResponse,
} from '../../../shared/types/api'
import { getCatalogItems } from '../../catalog/api'
import {
  createEstimate,
  getEstimate,
  getEstimatePreview,
  getEstimates,
  markEstimateItemNoMatch,
  saveEstimateMapping,
  setEstimateItemMatch,
  startEstimateMatching,
  startEstimateParse,
} from '../api'
import { getProjects } from '../../projects/api'
import { PaginationControls } from '../../../shared/ui/PaginationControls'
import { AsyncStatus } from '../../../shared/ui/AsyncStatus'
import { queryKeys } from '../../../shared/api/queryKeys'

export function EstimatesPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const listQuery = useQuery({
    queryKey: queryKeys.estimates(search, page),
    queryFn: () => getEstimates(search, page),
    placeholderData: keepPreviousData,
  })

  const items = listQuery.data?.results ?? []
  const loading = listQuery.isLoading || listQuery.isFetching
  const error = (listQuery.error as Error | null)?.message ?? null

  return (
    <AppLayout
      title="Сметы"
      subtitle="Загружайте сметы проектов, разбирайте их в позиции и проверяйте качество сопоставления."
      actions={
        <div className="button-row">
          <button className="button" onClick={() => void listQuery.refetch()}>
            Обновить
          </button>
          <button className="button button-primary" onClick={() => navigate('/estimates/new')}>
            Загрузить смету
          </button>
        </div>
      }
    >
      {error ? <div className="alert alert-error">{error}</div> : null}

      <article className="card">
        <div className="toolbar">
          <input
            className="input"
            placeholder="Поиск по смете или проекту"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button className="button" onClick={() => setPage(1)}>
            Найти
          </button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Название</th>
                <th>Проект</th>
                <th>Разбор</th>
                <th>Сопоставление</th>
                <th>Позиций</th>
                <th>Загружена</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="muted">
                    Загрузка смет...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted">
                    Сметы не найдены.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} onClick={() => navigate(`/estimates/${item.id}`)}>
                    <td>{item.name}</td>
                    <td>{item.project_name}</td>
                    <td><span className={`badge badge-${statusTone(item.status)}`}>{item.status}</span></td>
                    <td>
                      <span className={`badge badge-${statusTone(item.matching_status)}`}>
                        {item.matching_status}
                      </span>
                    </td>
                    <td>{item.items_count}</td>
                    <td>{formatDateTime(item.uploaded_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <PaginationControls
          count={listQuery.data?.count ?? 0}
          page={page}
          hasNext={Boolean(listQuery.data?.next)}
          hasPrevious={Boolean(listQuery.data?.previous)}
          loading={loading}
          onPageChange={setPage}
        />
      </article>
    </AppLayout>
  )
}

export function EstimateUploadPage() {
  const [project, setProject] = useState('')
  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const queryClient = useQueryClient()

  const projectsQuery = useQuery({
    queryKey: queryKeys.projects('', 1),
    queryFn: () => getProjects(),
  })

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => createEstimate(formData),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['estimates'] })
      navigate(`/estimates/${created.id}/preview`)
    },
  })

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!file) {
      return
    }

    const formData = new FormData()
    formData.append('project', project)
    formData.append('name', name)
    formData.append('source_file', file)
    await uploadMutation.mutateAsync(formData)
  }

  const error =
    (projectsQuery.error as Error | null)?.message ||
    (uploadMutation.error as Error | null)?.message ||
    null

  return (
    <AppLayout title="Загрузка сметы" subtitle="Привяжите файл сметы к проекту перед запуском обработки.">
      {error ? <div className="alert alert-error">{error}</div> : null}

      <article className="card narrow-card">
        <form className="form-grid" onSubmit={onSubmit}>
          <label className="field">
            <span>Проект</span>
            <select className="input" value={project} onChange={(event) => setProject(event.target.value)} required>
              <option value="">Выберите проект</option>
              {(projectsQuery.data?.results ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Название сметы</span>
            <input className="input" value={name} onChange={(event) => setName(event.target.value)} required />
          </label>

          <label className="field">
            <span>Файл</span>
            <input className="input" type="file" accept=".xlsx" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required />
          </label>

          <div className="button-row">
            <button className="button button-primary" type="submit" disabled={uploadMutation.isPending}>
              {uploadMutation.isPending ? 'Загрузка...' : 'Загрузить и продолжить'}
            </button>
            <button className="button" type="button" onClick={() => navigate('/estimates')}>
              Отмена
            </button>
          </div>
        </form>
      </article>
    </AppLayout>
  )
}

export function EstimatePreviewPage({ id }: { id: string }) {
  const detailQuery = useQuery({
    queryKey: queryKeys.estimate(id),
    queryFn: () => getEstimate(id),
  })

  const previewQuery = useQuery({
    queryKey: queryKeys.estimatePreview(id, '', 1),
    queryFn: () => getEstimatePreview(id, undefined, 1),
  })

  const detail = detailQuery.data
  const preview = previewQuery.data
  const error =
    (detailQuery.error as Error | null)?.message ||
    (previewQuery.error as Error | null)?.message ||
    null

  return (
    <AppLayout
      title={detail ? `Предпросмотр: ${detail.name}` : 'Предпросмотр сметы'}
      subtitle="Настройте предпросмотр файла и сопоставьте колонки сметы перед запуском обработки."
      actions={<button className="button" onClick={() => navigate(`/estimates/${id}`)}>К деталям</button>}
    >
      {error ? <div className="alert alert-error">{error}</div> : null}
      {!preview || !detail ? (
        <div className="card muted">Загрузка предпросмотра файла...</div>
      ) : (
        <EstimatePreviewContent id={id} detail={detail} initialPreview={preview} />
      )}
    </AppLayout>
  )
}

function EstimatePreviewContent({
  id,
  detail,
  initialPreview,
}: {
  id: string
  detail: Awaited<ReturnType<typeof getEstimate>>
  initialPreview: ExcelPreviewResponse
}) {
  const queryClient = useQueryClient()
  const [sheet, setSheet] = useState(initialPreview.selected_sheet)
  const [headerRow, setHeaderRow] = useState(initialPreview.header_row)
  const [fields, setFields] = useState<Record<string, string>>({
    article: detail.column_mapping?.fields?.article ?? '',
    name: detail.column_mapping?.fields?.name ?? '',
    unit: detail.column_mapping?.fields?.unit ?? '',
    quantity: detail.column_mapping?.fields?.quantity ?? '',
    material_price: detail.column_mapping?.fields?.material_price ?? '',
    labor_price: detail.column_mapping?.fields?.labor_price ?? '',
  })
  const [notice, setNotice] = useState<string | null>(null)

  const previewQuery = useQuery({
    queryKey: queryKeys.estimatePreview(id, sheet, headerRow),
    queryFn: () => getEstimatePreview(id, sheet || undefined, headerRow),
    initialData: initialPreview,
  })

  const saveMutation = useMutation({
    mutationFn: () =>
      saveEstimateMapping(id, {
        sheet,
        header_row: headerRow,
        fields,
      }),
    onSuccess: async () => {
      setNotice('Сопоставление колонок сохранено.')
      await queryClient.invalidateQueries({ queryKey: queryKeys.estimate(id) })
      await queryClient.invalidateQueries({ queryKey: ['estimate-preview', id] })
    },
  })

  const parseMutation = useMutation({
    mutationFn: () => startEstimateParse(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.estimate(id) })
      await queryClient.invalidateQueries({ queryKey: ['estimates'] })
      navigate(`/estimates/${id}`)
    },
  })

  const preview = previewQuery.data!
  const actionState = saveMutation.isPending ? 'saving' : parseMutation.isPending ? 'parsing' : 'idle'
  const error =
    (previewQuery.error as Error | null)?.message ||
    (saveMutation.error as Error | null)?.message ||
    (parseMutation.error as Error | null)?.message ||
    null

  return (
    <>
      {notice ? <div className="alert alert-success">{notice}</div> : null}
      {error ? <div className="alert alert-error">{error}</div> : null}
      <section className="grid two-column">
        <article className="card">
          <h2>Параметры файла</h2>
          <div className="form-grid compact-grid">
            <label className="field">
              <span>Лист</span>
              <select className="input" value={sheet} onChange={(event) => setSheet(event.target.value)}>
                {preview.sheet_names.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Строка заголовка</span>
              <input
                className="input"
                type="number"
                min="1"
                value={headerRow}
                onChange={(event) => setHeaderRow(Number(event.target.value))}
              />
            </label>

            <button className="button" onClick={() => void previewQuery.refetch()}>
              Обновить предпросмотр
            </button>
          </div>
        </article>

        <article className="card">
          <h2>Сопоставление колонок</h2>
          <div className="form-grid compact-grid">
            {['article', 'name', 'unit', 'quantity', 'material_price', 'labor_price'].map((field) => (
              <label className="field" key={field}>
                <span>
                  {field === 'article'
                    ? 'Артикул'
                    : field === 'name'
                      ? 'Название'
                      : field === 'unit'
                        ? 'Ед. изм.'
                        : field === 'quantity'
                          ? 'Количество'
                          : field === 'material_price'
                            ? 'Материалы'
                            : 'Работы'}
                </span>
                <select
                  className="input"
                  value={fields[field] ?? ''}
                  onChange={(event) =>
                    setFields((current) => ({ ...current, [field]: event.target.value }))
                  }
                >
                  <option value="">Не выбрано</option>
                  {preview.columns.map((column) => (
                    <option key={column.letter} value={column.letter}>
                      {column.letter} · {column.header}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <div className="button-row preview-actions">
            <button className="button" onClick={() => void saveMutation.mutateAsync()} disabled={actionState !== 'idle'}>
              {actionState === 'saving' ? 'Сохранение...' : 'Сохранить сопоставление'}
            </button>
            <button className="button button-primary" onClick={() => void parseMutation.mutateAsync()} disabled={actionState !== 'idle'}>
              {actionState === 'parsing' ? 'Запуск...' : 'Запустить обработку'}
            </button>
          </div>
        </article>
      </section>

      <EstimatePreviewTable preview={preview} highlightedColumns={Object.values(fields)} />
    </>
  )
}

export function EstimateDetailPage({ id }: { id: string }) {
  const detailQuery = useQuery({
    queryKey: queryKeys.estimate(id),
    queryFn: () => getEstimate(id),
    refetchInterval: (query) =>
      query.state.data?.status === 'processing' || query.state.data?.matching_status === 'processing'
        ? 2500
        : false,
  })
  const startMatchingMutation = useMutation({
    mutationFn: () => startEstimateMatching(id),
    onSuccess: () => navigate(`/estimates/${id}/matching`),
  })

  const detail = detailQuery.data
  const error =
    (detailQuery.error as Error | null)?.message ||
    (startMatchingMutation.error as Error | null)?.message ||
    null

  return (
    <AppLayout
      title={detail ? detail.name : 'Детали сметы'}
      subtitle="Отслеживайте прогресс разбора и сопоставления, затем просматривайте позиции сметы и их статусы."
      actions={
        <div className="button-row">
          <button className="button" onClick={() => navigate(`/estimates/${id}/preview`)}>
            Предпросмотр и сопоставление
          </button>
          <button className="button button-primary" onClick={() => void startMatchingMutation.mutateAsync()} disabled={startMatchingMutation.isPending}>
            {startMatchingMutation.isPending ? 'Запуск...' : 'Запустить сопоставление'}
          </button>
          <button className="button" onClick={() => navigate(`/estimates/${id}/matching`)}>
            Проверить сопоставления
          </button>
        </div>
      }
    >
      {error ? <div className="alert alert-error">{error}</div> : null}
      {!detail ? (
        <div className="card muted">Загрузка данных...</div>
      ) : (
        <>
          {(detail.status === 'processing' || detail.matching_status === 'processing') ? (
            <section className="grid two-column">
              <AsyncStatus
                title="Разбор сметы"
                status={detail.status}
                progress={detail.progress}
                detail="Страница обновляется автоматически, пока выполняется фоновая обработка."
              />
              <AsyncStatus
                title="Сопоставление сметы"
                status={detail.matching_status}
                progress={detail.matching_progress}
                detail={detail.matching_status === 'pending' ? 'Сопоставление еще не запускалось.' : undefined}
              />
            </section>
          ) : null}
          {detail.status === 'failed' ? (
            <div className="alert alert-error">
              Разбор сметы завершился ошибкой. Проверьте ошибки парсера ниже и скорректируйте сопоставление колонок.
            </div>
          ) : null}
          {detail.matching_status === 'failed' ? (
            <div className="alert alert-error">
              Сопоставление сметы завершилось ошибкой. После проверки позиций попробуйте запустить его повторно.
            </div>
          ) : null}
          <section className="grid three-column">
            <article className="card">
              <h2>Разбор</h2>
              <p><span className={`badge badge-${statusTone(detail.status)}`}>{detail.status}</span></p>
              <p className="muted">Прогресс {detail.progress}%</p>
            </article>
            <article className="card">
              <h2>Сопоставление</h2>
              <p>
                <span className={`badge badge-${statusTone(detail.matching_status)}`}>
                  {detail.matching_status}
                </span>
              </p>
              <p className="muted">Прогресс {detail.matching_progress}%</p>
            </article>
            <article className="card">
              <h2>Проект</h2>
              <p>{detail.project_name}</p>
              <p className="muted">Загружена {formatDateTime(detail.uploaded_at)}</p>
            </article>
          </section>

          <article className="card">
            <h2>Ошибки парсера</h2>
            {detail.parser_errors.length === 0 ? (
              <p className="muted">Ошибки парсера отсутствуют.</p>
            ) : (
              <ul className="stack-list">
                {detail.parser_errors.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            )}
          </article>

          <article className="card">
            <h2>Позиции сметы</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Артикул</th>
                    <th>Название</th>
                    <th>Кол-во</th>
                    <th>Материалы</th>
                    <th>Работы</th>
                    <th>Статус сопоставления</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="muted">
                        Распознанные строки пока отсутствуют.
                      </td>
                    </tr>
                  ) : (
                    detail.items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.article || '—'}</td>
                        <td>{item.name}</td>
                        <td>{formatNumber(item.quantity)}</td>
                        <td>{item.material_price ? formatNumber(item.material_price) : '—'}</td>
                        <td>{item.labor_price ? formatNumber(item.labor_price) : '—'}</td>
                        <td>
                          <span className={`badge badge-${statusTone(item.match?.status ?? 'pending')}`}>
                            {item.match?.status ?? 'pending'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </>
      )}
    </AppLayout>
  )
}

export function EstimateMatchingPage({ id }: { id: string }) {
  const [search, setSearch] = useState('')
  const [matchFilter, setMatchFilter] = useState('all')
  const [selectedItem, setSelectedItem] = useState<EstimateItem | null>(null)
  const [catalogSearch, setCatalogSearch] = useState('')
  const [catalogChoice, setCatalogChoice] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const detailQuery = useQuery({
    queryKey: queryKeys.estimate(id),
    queryFn: () => getEstimate(id),
    refetchInterval: (query) =>
      query.state.data?.matching_status === 'processing' ? 2500 : false,
  })

  const catalogQuery = useQuery({
    queryKey: queryKeys.catalogItems(catalogSearch, 1),
    queryFn: () => getCatalogItems(catalogSearch),
    placeholderData: keepPreviousData,
  })

  const manualMatchMutation = useMutation({
    mutationFn: () => setEstimateItemMatch(selectedItem!.id, Number(catalogChoice)),
    onSuccess: async () => {
      setNotice('Ручное сопоставление сохранено.')
      await queryClient.invalidateQueries({ queryKey: queryKeys.estimate(id) })
    },
  })

  const noMatchMutation = useMutation({
    mutationFn: () => markEstimateItemNoMatch(selectedItem!.id),
    onSuccess: async () => {
      setNotice('Позиция отмечена как без совпадения.')
      await queryClient.invalidateQueries({ queryKey: queryKeys.estimate(id) })
    },
  })

  const detail = detailQuery.data
  const catalogItems = catalogQuery.data?.results ?? []
  const filteredItems = useMemo(() => {
    const currentItems = detail?.items ?? []
    return currentItems.filter((item) => {
      const matchesStatus =
        matchFilter === 'all' ? true : (item.match?.status ?? 'pending') === matchFilter
      const haystack = `${item.article} ${item.name}`.toLowerCase()
      return matchesStatus && haystack.includes(search.toLowerCase())
    })
  }, [detail?.items, matchFilter, search])
  const saving = manualMatchMutation.isPending || noMatchMutation.isPending
  const error =
    (detailQuery.error as Error | null)?.message ||
    (catalogQuery.error as Error | null)?.message ||
    (manualMatchMutation.error as Error | null)?.message ||
    (noMatchMutation.error as Error | null)?.message ||
    null

  return (
    <AppLayout
      title={detail ? `Сопоставление: ${detail.name}` : 'Сопоставление сметы'}
      subtitle="Фильтруйте строки по статусу, анализируйте уверенность и вручную исправляйте спорные совпадения."
      actions={
        <button className="button" onClick={() => navigate(`/estimates/${id}`)}>
          К смете
        </button>
      }
    >
      {notice ? <div className="alert alert-success">{notice}</div> : null}
      {error ? <div className="alert alert-error">{error}</div> : null}
      {!detail ? (
        <div className="card muted">Загрузка страницы сопоставления...</div>
      ) : (
        <>
          {detail.matching_status === 'processing' ? (
            <AsyncStatus
              title="Идет сопоставление"
              status={detail.matching_status}
              progress={detail.matching_progress}
              detail="Результаты обновляются автоматически, пока выполняется сопоставление."
            />
          ) : null}
          {detail.matching_status === 'failed' ? (
            <div className="alert alert-error">
              Сопоставление для этой сметы завершилось ошибкой. Вернитесь на страницу деталей, чтобы повторить запуск.
            </div>
          ) : null}
          <section className="grid matching-layout">
            <article className="card">
              <div className="toolbar">
                <input
                  className="input"
                  placeholder="Поиск по позициям сметы"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <select className="input" value={matchFilter} onChange={(event) => setMatchFilter(event.target.value)}>
                  <option value="all">Все</option>
                  <option value="matched">Сопоставлено</option>
                  <option value="needs_review">Требует проверки</option>
                  <option value="no_match">Без совпадения</option>
                  <option value="pending">Ожидает</option>
                </select>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Артикул</th>
                      <th>Название</th>
                      <th>Кол-во</th>
                      <th>Позиция каталога</th>
                      <th>Метод</th>
                      <th>Уверенность</th>
                      <th>Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="muted">
                          Нет позиций сметы, подходящих под текущие фильтры.
                        </td>
                      </tr>
                    ) : filteredItems.map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => {
                          setSelectedItem(item)
                          setCatalogChoice(item.match?.catalog_item ? String(item.match.catalog_item) : '')
                        }}
                        className={selectedItem?.id === item.id ? 'is-selected' : ''}
                      >
                        <td>{item.article || '—'}</td>
                        <td>{item.name}</td>
                        <td>{formatNumber(item.quantity)}</td>
                        <td>{item.match?.catalog_item_name || '—'}</td>
                        <td>{item.match?.method || '—'}</td>
                        <td>{item.match?.confidence ? formatNumber(item.match.confidence) : '—'}</td>
                        <td>
                          <span className={`badge badge-${statusTone(item.match?.status ?? 'pending')}`}>
                            {item.match?.status ?? 'pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="card">
              <h2>Ручная корректировка</h2>
              {!selectedItem ? (
                <p className="muted">Выберите строку сметы, чтобы задать ручное совпадение или отметить отсутствие совпадения.</p>
              ) : (
                <>
                  <p><strong>{selectedItem.name}</strong></p>
                  <p className="muted">Артикул {selectedItem.article || '—'} · Кол-во {formatNumber(selectedItem.quantity)}</p>

                  <div className="form-grid">
                    <label className="field">
                      <span>Поиск позиции каталога</span>
                      <div className="toolbar">
                        <input
                          className="input"
                          placeholder="Поиск по каталогу"
                          value={catalogSearch}
                          onChange={(event) => setCatalogSearch(event.target.value)}
                        />
                        <button className="button" onClick={() => void catalogQuery.refetch()} disabled={catalogQuery.isFetching}>
                          {catalogQuery.isFetching ? 'Поиск...' : 'Найти'}
                        </button>
                      </div>
                    </label>

                    <label className="field">
                      <span>Позиция каталога</span>
                      <select className="input" value={catalogChoice} onChange={(event) => setCatalogChoice(event.target.value)}>
                        <option value="">Выберите позицию каталога</option>
                        {catalogItems.map((item: CatalogItem) => (
                          <option key={item.id} value={item.id}>
                            {item.article ? `${item.article} · ` : ''}{item.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="button-row">
                      <button className="button button-primary" onClick={() => void manualMatchMutation.mutateAsync()} disabled={saving || !catalogChoice}>
                        {saving ? 'Сохранение...' : 'Установить вручную'}
                      </button>
                      <button className="button button-danger" onClick={() => void noMatchMutation.mutateAsync()} disabled={saving}>
                        {saving ? 'Сохранение...' : 'Отметить как без совпадения'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </article>
          </section>
        </>
      )}
    </AppLayout>
  )
}

function EstimatePreviewTable({
  preview,
  highlightedColumns,
}: {
  preview: ExcelPreviewResponse
  highlightedColumns: string[]
}) {
  const highlighted = useMemo(() => new Set(highlightedColumns.filter(Boolean)), [highlightedColumns])

  return (
    <article className="card">
      <h2>Предпросмотр Excel</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Строка</th>
              {preview.columns.map((column) => (
                <th key={column.letter} className={highlighted.has(column.letter) ? 'column-highlight' : ''}>
                  {column.letter}
                  <small>{column.header}</small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.rows.map((row) => (
              <tr key={row.row_number}>
                <td>{row.row_number}</td>
                {preview.columns.map((column) => (
                  <td key={column.letter} className={highlighted.has(column.letter) ? 'column-highlight' : ''}>
                    {row.values[column.letter] || '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  )
}
