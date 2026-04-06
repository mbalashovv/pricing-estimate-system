import { AppLayout } from '../../../app/layouts/AppLayout'
import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { getCatalogGroups, getCatalogItems } from '../../catalog/api'
import { getEstimates } from '../../estimates/api'
import { getPriceLists } from '../../price-lists/api'
import { getProjects } from '../../projects/api'
import { getSuppliers } from '../../suppliers/api'
import { formatDateTime } from '../../../shared/lib/format'
import { queryKeys } from '../../../shared/api/queryKeys'

type SummaryState = {
  suppliers: number
  catalogGroups: number
  catalogItems: number
  projects: number
  priceLists: number
  estimates: number
  updatedAt: string
}

export function DashboardPage() {
  const results = useQueries({
    queries: [
      { queryKey: [...queryKeys.dashboard, 'suppliers'], queryFn: () => getSuppliers() },
      { queryKey: [...queryKeys.dashboard, 'catalog-groups'], queryFn: () => getCatalogGroups() },
      { queryKey: [...queryKeys.dashboard, 'catalog-items'], queryFn: () => getCatalogItems() },
      { queryKey: [...queryKeys.dashboard, 'projects'], queryFn: () => getProjects() },
      { queryKey: [...queryKeys.dashboard, 'price-lists'], queryFn: () => getPriceLists() },
      { queryKey: [...queryKeys.dashboard, 'estimates'], queryFn: () => getEstimates() },
    ],
  })

  const loading = results.some((query) => query.isLoading)
  const error = results.find((query) => query.error)?.error?.message ?? null
  const summary = useMemo<SummaryState>(() => ({
    suppliers: results[0].data?.count ?? 0,
    catalogGroups: results[1].data?.count ?? 0,
    catalogItems: results[2].data?.count ?? 0,
    projects: results[3].data?.count ?? 0,
    priceLists: results[4].data?.count ?? 0,
    estimates: results[5].data?.count ?? 0,
    updatedAt: results.every((query) => query.data) ? new Date().toISOString() : '',
  }), [results])

  return (
    <AppLayout
      title="Панель управления"
      subtitle="Краткий обзор справочников, загрузок, сопоставления и обработки данных в системе."
    >
      {error ? <div className="alert alert-error">{error}</div> : null}

      <section className="grid cards-grid">
        {[
          ['Поставщики', summary.suppliers],
          ['Группы каталога', summary.catalogGroups],
          ['Позиции каталога', summary.catalogItems],
          ['Проекты', summary.projects],
          ['Прайс-листы', summary.priceLists],
          ['Сметы', summary.estimates],
        ].map(([label, value]) => (
          <article className="card stat-card" key={label}>
            <p className="muted">{label}</p>
            <strong>{loading ? '...' : value}</strong>
          </article>
        ))}
      </section>

      <section className="grid two-column">
        <article className="card">
          <h2>Основной процесс</h2>
          <ol className="flow-list">
            <li>Создайте поставщиков, группы каталога, позиции каталога и проекты.</li>
            <li>Загрузите прайс-листы `.xls` или `.xlsx`, затем сопоставьте исходные колонки.</li>
            <li>Запустите сопоставление позиций прайс-листа с товарами каталога и вручную обработайте спорные или отсутствующие совпадения.</li>
            <li>Загрузите проектные сметы и настройте для них отдельное сопоставление колонок.</li>
            <li>Запустите сопоставление сметы с каталогом и проверьте результаты по статусу и уверенности.</li>
          </ol>
        </article>

        <article className="card">
          <h2>Статус</h2>
          <p className="muted">
            Этот интерфейс напрямую работает с текущим backend REST API и локальными медиафайлами.
          </p>
          <p className="muted">
            {summary.updatedAt
              ? `Данные обновлены ${formatDateTime(summary.updatedAt)}`
              : 'Запустите backend, чтобы загрузить актуальные показатели.'}
          </p>
        </article>
      </section>
    </AppLayout>
  )
}
