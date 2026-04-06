import type { FormEvent } from 'react'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppLayout } from '../../../app/layouts/AppLayout'
import { createSupplier, deleteSupplier, getSuppliers, updateSupplier } from '../api'
import type { Supplier } from '../../../shared/types/api'
import { formatDateTime } from '../../../shared/lib/format'
import { PaginationControls } from '../../../shared/ui/PaginationControls'
import { queryKeys } from '../../../shared/api/queryKeys'

const initialForm = { name: '', inn: '', currency: 'RUB' }
const currencyOptions = [
  { value: 'RUB', label: 'Российский рубль (RUB)' },
  { value: 'USD', label: 'Доллар США (USD)' },
  { value: 'EUR', label: 'Евро (EUR)' },
]

export function SuppliersPage() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Supplier | null>(null)
  const [form, setForm] = useState(initialForm)
  const [page, setPage] = useState(1)
  const [notice, setNotice] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const suppliersQuery = useQuery({
    queryKey: queryKeys.suppliers(search, page),
    queryFn: () => getSuppliers(search, page),
  })

  const saveMutation = useMutation({
    mutationFn: (payload: typeof form) =>
      selected ? updateSupplier(selected.id, payload) : createSupplier(payload),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      if (selected) {
        setSelected(result)
        setForm({
          name: result.name,
          inn: result.inn,
          currency: result.currency,
        })
      } else {
        setForm(initialForm)
      }
      setNotice(selected ? 'Supplier updated.' : 'Supplier created.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSupplier(id),
    onSuccess: async () => {
      setSelected(null)
      setForm(initialForm)
      setNotice('Supplier deleted.')
      await queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
  })

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    await saveMutation.mutateAsync(form).catch(() => setNotice(null))
  }

  const handleDelete = async () => {
    if (!selected) {
      return
    }

    await deleteMutation.mutateAsync(selected.id).catch(() => setNotice(null))
  }

  const items = suppliersQuery.data?.results ?? []
  const error =
    (suppliersQuery.error as Error | null)?.message ||
    (saveMutation.error as Error | null)?.message ||
    (deleteMutation.error as Error | null)?.message ||
    null
  const loading = suppliersQuery.isLoading || suppliersQuery.isFetching
  const saving = saveMutation.isPending || deleteMutation.isPending

  return (
    <AppLayout
      title="Поставщики"
      subtitle="Управление справочником поставщиков, используемых в загружаемых прайс-листах."
      actions={
        <button className="button" onClick={() => suppliersQuery.refetch()} disabled={loading}>
          Обновить
        </button>
      }
    >
      {notice ? <div className="alert alert-success">{notice}</div> : null}
      {error ? <div className="alert alert-error">{error}</div> : null}

      <section className="grid two-column">
        <article className="card">
          <div className="toolbar">
            <input
              className="input"
              placeholder="Поиск по названию или ИНН"
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
                  <th>INN</th>
                  <th>Валюта</th>
                  <th>Создан</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="muted">
                      Загрузка поставщиков...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="muted">
                      Поставщики пока не добавлены.
                    </td>
                  </tr>
                ) : (
                  items.map((supplier) => (
                    <tr
                      key={supplier.id}
                      className={selected?.id === supplier.id ? 'is-selected' : ''}
                      onClick={() => {
                        setSelected(supplier)
                        setForm({
                          name: supplier.name,
                          inn: supplier.inn,
                          currency: supplier.currency,
                        })
                      }}
                    >
                      <td>{supplier.name}</td>
                      <td>{supplier.inn || '—'}</td>
                      <td>{supplier.currency || '—'}</td>
                      <td>{formatDateTime(supplier.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <PaginationControls
            count={suppliersQuery.data?.count ?? 0}
            page={page}
            hasNext={Boolean(suppliersQuery.data?.next)}
            hasPrevious={Boolean(suppliersQuery.data?.previous)}
            loading={loading}
            onPageChange={setPage}
          />
        </article>

        <article className="card">
          <div className="split-header">
            <div>
              <h2>{selected ? 'Редактирование поставщика' : 'Создание поставщика'}</h2>
              <p className="muted">Выберите строку в таблице, чтобы загрузить данные в форму.</p>
            </div>
            {selected ? (
              <button
                className="button button-ghost"
                onClick={() => {
                  setSelected(null)
                  setForm(initialForm)
                }}
              >
                Новый
              </button>
            ) : null}
          </div>

          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="field">
              <span>Название</span>
              <input
                className="input"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </label>

            <label className="field">
              <span>ИНН</span>
              <input
                className="input"
                value={form.inn}
                onChange={(event) => setForm((current) => ({ ...current, inn: event.target.value }))}
              />
            </label>

            <label className="field">
              <span>Валюта</span>
              <select
                className="input"
                value={form.currency}
                onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))}
              >
                {currencyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="button-row">
              <button className="button button-primary" type="submit" disabled={saving}>
                {saving ? 'Сохранение...' : selected ? 'Сохранить изменения' : 'Создать поставщика'}
              </button>
              {selected ? (
                <button
                  className="button button-danger"
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                >
                  Удалить
                </button>
              ) : null}
            </div>
          </form>
        </article>
      </section>
    </AppLayout>
  )
}
