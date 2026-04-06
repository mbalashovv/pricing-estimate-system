import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppLayout } from '../../../app/layouts/AppLayout'
import { navigate } from '../../../app/router/router'
import {
  formatDateTime,
  formatMoney,
  formatNumber,
  getMatchMethodLabel,
  getPriceListMatchStatusLabel,
  statusTone,
} from '../../../shared/lib/format'
import type { CatalogItem, PriceListItem, Supplier } from '../../../shared/types/api'
import { getCatalogItems } from '../../catalog/api'
import { getSupplier, getSuppliers } from '../../suppliers/api'
import {
  createPriceList,
  getPriceList,
  getPriceListPreview,
  getPriceLists,
  markPriceListItemNoMatch,
  savePriceListMapping,
  setPriceListItemMatch,
  startPriceListMatch,
  startPriceListParse,
} from '../api'
import type { ExcelPreviewResponse } from '../../../shared/types/api'
import { PaginationControls } from '../../../shared/ui/PaginationControls'
import { AsyncStatus } from '../../../shared/ui/AsyncStatus'
import { queryKeys } from '../../../shared/api/queryKeys'

export function PriceListsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const listQuery = useQuery({
    queryKey: queryKeys.priceLists(search, page),
    queryFn: () => getPriceLists(search, page),
    placeholderData: keepPreviousData,
  })

  const items = listQuery.data?.results ?? []
  const loading = listQuery.isLoading || listQuery.isFetching
  const error = (listQuery.error as Error | null)?.message ?? null

  return (
    <AppLayout
      title="Прайс-листы"
      subtitle="Загружайте прайс-листы поставщиков, сопоставляйте колонки Excel и отслеживайте ход обработки."
      actions={
        <div className="button-row">
          <button className="button" onClick={() => void listQuery.refetch()}>
            Обновить
          </button>
          <button className="button button-primary" onClick={() => navigate('/price-lists/new')}>
            Загрузить прайс-лист
          </button>
        </div>
      }
    >
      {error ? <div className="alert alert-error">{error}</div> : null}

      <article className="card">
        <div className="toolbar">
          <input
            className="input"
            placeholder="Поиск по прайс-листу или поставщику"
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
                <th>Поставщик</th>
                <th>Статус</th>
                <th>Позиций</th>
                <th>Загружен</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="muted">
                    Загрузка прайс-листов...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted">
                    Прайс-листы не найдены.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} onClick={() => navigate(`/price-lists/${item.id}`)}>
                    <td>{item.name}</td>
                    <td>{item.supplier_name}</td>
                    <td>
                      <span className={`badge badge-${statusTone(item.status)}`}>{item.status}</span>
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

export function PriceListUploadPage() {
  const [supplier, setSupplier] = useState('')
  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const queryClient = useQueryClient()

  const suppliersQuery = useQuery({
    queryKey: queryKeys.suppliers('', 1),
    queryFn: () => getSuppliers(),
  })

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => createPriceList(formData),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['price-lists'] })
      navigate(`/price-lists/${created.id}/preview`)
    },
  })

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!file) {
      return
    }

    const formData = new FormData()
    formData.append('supplier', supplier)
    formData.append('name', name)
    formData.append('source_file', file)
    await uploadMutation.mutateAsync(formData)
  }

  const error =
    (suppliersQuery.error as Error | null)?.message ||
    (uploadMutation.error as Error | null)?.message ||
    null

  return (
    <AppLayout title="Загрузка прайс-листа" subtitle="Укажите поставщика, название прайс-листа и исходный файл Excel.">
      {error ? <div className="alert alert-error">{error}</div> : null}

      <article className="card narrow-card">
        <form className="form-grid" onSubmit={onSubmit}>
          <label className="field">
            <span>Поставщик</span>
            <select className="input" value={supplier} onChange={(event) => setSupplier(event.target.value)} required>
              <option value="">Выберите поставщика</option>
              {(suppliersQuery.data?.results ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Название прайс-листа</span>
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
            <button className="button" type="button" onClick={() => navigate('/price-lists')}>
              Отмена
            </button>
          </div>
        </form>
      </article>
    </AppLayout>
  )
}

export function PriceListPreviewPage({ id }: { id: string }) {
  const detailQuery = useQuery({
    queryKey: queryKeys.priceList(id),
    queryFn: () => getPriceList(id),
  })

  const previewQuery = useQuery({
    queryKey: queryKeys.priceListPreview(id, '', 1),
    queryFn: () => getPriceListPreview(id, undefined, 1),
  })

  const detail = detailQuery.data
  const preview = previewQuery.data
  const error =
    (detailQuery.error as Error | null)?.message ||
    (previewQuery.error as Error | null)?.message ||
    null

  return (
    <AppLayout
      title={detail ? `Предпросмотр: ${detail.name}` : 'Предпросмотр прайс-листа'}
      subtitle="Выберите лист и строку заголовка, затем сопоставьте колонки перед запуском обработки."
      actions={<button className="button" onClick={() => navigate(`/price-lists/${id}`)}>К деталям</button>}
    >
      {error ? <div className="alert alert-error">{error}</div> : null}
      {!preview || !detail ? (
        <div className="card muted">Загрузка предпросмотра файла...</div>
      ) : (
        <PriceListPreviewContent id={id} detail={detail} initialPreview={preview} />
      )}
    </AppLayout>
  )
}

function PriceListPreviewContent({
  id,
  detail,
  initialPreview,
}: {
  id: string
  detail: Awaited<ReturnType<typeof getPriceList>>
  initialPreview: ExcelPreviewResponse
}) {
  const queryClient = useQueryClient()
  const [sheet, setSheet] = useState(initialPreview.selected_sheet)
  const [headerRow, setHeaderRow] = useState(initialPreview.header_row)
  const [fields, setFields] = useState<Record<string, string>>({
    article: detail.column_mapping?.fields?.article ?? '',
    name: detail.column_mapping?.fields?.name ?? '',
    unit: detail.column_mapping?.fields?.unit ?? '',
    price: detail.column_mapping?.fields?.price ?? '',
  })
  const [notice, setNotice] = useState<string | null>(null)

  const previewQuery = useQuery({
    queryKey: queryKeys.priceListPreview(id, sheet, headerRow),
    queryFn: () => getPriceListPreview(id, sheet || undefined, headerRow),
    initialData: initialPreview,
  })

  const saveMutation = useMutation({
    mutationFn: () =>
      savePriceListMapping(id, {
        sheet,
        header_row: headerRow,
        fields,
      }),
    onSuccess: async () => {
      setNotice('Сопоставление колонок сохранено.')
      await queryClient.invalidateQueries({ queryKey: queryKeys.priceList(id) })
      await queryClient.invalidateQueries({ queryKey: ['price-list-preview', id] })
    },
  })

  const parseMutation = useMutation({
    mutationFn: () => startPriceListParse(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.priceList(id) })
      await queryClient.invalidateQueries({ queryKey: ['price-lists'] })
      navigate(`/price-lists/${id}`)
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
                {preview.sheet_names.map((name) => (
                  <option key={name} value={name}>
                    {name}
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
            {['article', 'name', 'unit', 'price'].map((field) => (
              <label className="field" key={field}>
                <span>
                  {field === 'article'
                    ? 'Артикул'
                    : field === 'name'
                      ? 'Название'
                      : field === 'unit'
                        ? 'Ед. изм.'
                        : 'Цена'}
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

      <PreviewTable preview={preview} highlightedColumns={Object.values(fields)} />
    </>
  )
}

export function PriceListDetailPage({ id }: { id: string }) {
  const [selectedItem, setSelectedItem] = useState<PriceListItem | null>(null)
  const [catalogSearch, setCatalogSearch] = useState('')
  const [catalogChoice, setCatalogChoice] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const detailQuery = useQuery({
    queryKey: queryKeys.priceList(id),
    queryFn: () => getPriceList(id),
    refetchInterval: (query) =>
      query.state.data?.status === 'processing' || query.state.data?.matching_status === 'processing'
        ? 2500
        : false,
  })

  const supplierQuery = useQuery({
    queryKey: queryKeys.supplier(detailQuery.data?.supplier ?? ''),
    queryFn: () => getSupplier(detailQuery.data!.supplier),
    enabled: Boolean(detailQuery.data?.supplier),
  })

  const catalogQuery = useQuery({
    queryKey: queryKeys.catalogItems(catalogSearch, 1),
    queryFn: () => getCatalogItems(catalogSearch),
    placeholderData: keepPreviousData,
  })

  const startMatchMutation = useMutation({
    mutationFn: () => startPriceListMatch(id),
    onSuccess: async () => {
      setNotice('Сопоставление прайс-листа запущено.')
      await queryClient.invalidateQueries({ queryKey: queryKeys.priceList(id) })
      await queryClient.invalidateQueries({ queryKey: ['price-lists'] })
    },
  })

  const manualMatchMutation = useMutation({
    mutationFn: () => setPriceListItemMatch(selectedItem!.id, Number(catalogChoice)),
    onSuccess: async () => {
      setNotice('Ручное сопоставление сохранено.')
      await queryClient.invalidateQueries({ queryKey: queryKeys.priceList(id) })
    },
  })

  const noMatchMutation = useMutation({
    mutationFn: () => markPriceListItemNoMatch(selectedItem!.id),
    onSuccess: async () => {
      setNotice('Позиция отмечена как не сопоставленная.')
      await queryClient.invalidateQueries({ queryKey: queryKeys.priceList(id) })
    },
  })

  const detail = detailQuery.data
  const supplier = supplierQuery.data as Supplier | undefined
  const catalogItems = (catalogQuery.data?.results ?? []) as CatalogItem[]
  const saving = startMatchMutation.isPending || manualMatchMutation.isPending || noMatchMutation.isPending
  const error =
    (detailQuery.error as Error | null)?.message ||
    (supplierQuery.error as Error | null)?.message ||
    (catalogQuery.error as Error | null)?.message ||
    (startMatchMutation.error as Error | null)?.message ||
    (manualMatchMutation.error as Error | null)?.message ||
    (noMatchMutation.error as Error | null)?.message ||
    null

  return (
    <AppLayout
      title={detail ? detail.name : 'Детали прайс-листа'}
      subtitle="Просмотр статуса обработки, ошибок парсера и распознанных строк прайс-листа."
      actions={
        <div className="button-row">
          <button className="button" onClick={() => navigate(`/price-lists/${id}/preview`)}>
            Предпросмотр и сопоставление
          </button>
          <button
            className="button button-primary"
            onClick={() => void startMatchMutation.mutateAsync()}
            disabled={saving || detail?.items.length === 0}
          >
            {startMatchMutation.isPending ? 'Запуск...' : 'Запустить сопоставление'}
          </button>
          <button className="button" onClick={() => navigate('/price-lists')}>
            К списку
          </button>
        </div>
      }
    >
      {notice ? <div className="alert alert-success">{notice}</div> : null}
      {error ? <div className="alert alert-error">{error}</div> : null}
      {!detail ? (
        <div className="card muted">Загрузка данных...</div>
      ) : (
        <>
          {detail.status === 'processing' ? (
            <AsyncStatus
              title="Идет обработка"
              status={detail.status}
              progress={detail.progress}
              detail="Страница обновляется автоматически, пока выполняется обработка."
            />
          ) : null}
          {detail.matching_status === 'processing' ? (
            <AsyncStatus
              title="Идет сопоставление"
              status={detail.matching_status}
              progress={detail.matching_progress}
              detail="Страница обновляется автоматически, пока выполняется сопоставление с каталогом."
            />
          ) : null}
          {detail.status === 'failed' ? (
            <div className="alert alert-error">
              Обработка прайс-листа завершилась ошибкой. Проверьте ошибки парсера ниже и при необходимости измените сопоставление колонок.
            </div>
          ) : null}
          {detail.matching_status === 'failed' ? (
            <div className="alert alert-error">
              Сопоставление прайс-листа завершилось ошибкой. Повторите запуск после проверки данных.
            </div>
          ) : null}
          <section className="grid two-column">
            <article className="card">
              <h2>Сводка</h2>
              <dl className="details-grid">
                <dt>Поставщик</dt>
                <dd>{detail.supplier_name}</dd>
                <dt>Статус</dt>
                <dd><span className={`badge badge-${statusTone(detail.status)}`}>{detail.status}</span></dd>
                <dt>Прогресс</dt>
                <dd>{detail.progress}%</dd>
                <dt>Сопоставление</dt>
                <dd>
                  <span className={`badge badge-${statusTone(detail.matching_status)}`}>
                    {getPriceListMatchStatusLabel(detail.matching_status)}
                  </span>
                </dd>
                <dt>Прогресс сопоставления</dt>
                <dd>{detail.matching_progress}%</dd>
                <dt>Загружен</dt>
                <dd>{formatDateTime(detail.uploaded_at)}</dd>
              </dl>
            </article>

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
          </section>

          <section className="grid matching-layout">
            <article className="card">
              <div className="split-header">
                <div>
                  <h2>Позиции прайс-листа</h2>
                  <p className="muted">Из файла обработано строк: {detail.items.length}.</p>
                </div>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Артикул</th>
                      <th>Название</th>
                      <th>Ед. изм.</th>
                      <th>Цена</th>
                      <th>Товар каталога</th>
                      <th>Статус</th>
                      <th>Метод</th>
                      <th>Уверенность</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.items.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="muted">
                          Распознанные строки пока отсутствуют.
                        </td>
                      </tr>
                    ) : (
                      detail.items.map((item) => (
                        <tr
                          key={item.id}
                          className={selectedItem?.id === item.id ? 'is-selected' : ''}
                          onClick={() => {
                            setSelectedItem(item)
                            setCatalogChoice(item.catalog_item ? String(item.catalog_item) : '')
                          }}
                        >
                          <td>{item.article || '—'}</td>
                          <td>{item.name}</td>
                          <td>{item.unit || '—'}</td>
                          <td>{formatMoney(item.price, supplier?.currency)}</td>
                          <td>
                            {item.catalog_item_name
                              ? `${item.catalog_item_article ? `${item.catalog_item_article} · ` : ''}${item.catalog_item_name}`
                              : '—'}
                          </td>
                          <td>
                            <span className={`badge badge-${statusTone(item.match_status)}`}>
                              {getPriceListMatchStatusLabel(item.match_status)}
                            </span>
                          </td>
                          <td>{getMatchMethodLabel(item.match_method)}</td>
                          <td>{item.match_confidence ? formatNumber(item.match_confidence) : '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="card">
              <h2>Ручная привязка</h2>
              {!selectedItem ? (
                <p className="muted">Выберите позицию прайс-листа, чтобы вручную привязать ее к товару каталога.</p>
              ) : (
                <>
                  <p><strong>{selectedItem.name}</strong></p>
                  <p className="muted">
                    Артикул {selectedItem.article || '—'} · Цена {formatMoney(selectedItem.price, supplier?.currency)}
                  </p>

                  <div className="form-grid">
                    <label className="field">
                      <span>Поиск товара каталога</span>
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
                      <span>Товар каталога</span>
                      <select
                        className="input"
                        value={catalogChoice}
                        onChange={(event) => setCatalogChoice(event.target.value)}
                      >
                        <option value="">Выберите товар каталога</option>
                        {catalogItems.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.article ? `${item.article} · ` : ''}{item.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="button-row">
                      <button
                        className="button button-primary"
                        onClick={() => void manualMatchMutation.mutateAsync()}
                        disabled={saving || !catalogChoice}
                      >
                        {saving ? 'Сохранение...' : 'Привязать вручную'}
                      </button>
                      <button
                        className="button button-danger"
                        onClick={() => void noMatchMutation.mutateAsync()}
                        disabled={saving}
                      >
                        {saving ? 'Сохранение...' : 'Не сопоставлено'}
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

function PreviewTable({
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
