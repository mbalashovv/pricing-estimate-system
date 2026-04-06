import { AppLayout } from './layouts/AppLayout'
import { resolveRoute, usePathname } from './router/router'
import { DashboardPage } from '../features/dashboard/pages/DashboardPage'
import { SuppliersPage } from '../features/suppliers/pages/SuppliersPage'
import { CatalogPage } from '../features/catalog/pages/CatalogPage'
import { ProjectsPage } from '../features/projects/pages/ProjectsPage'
import {
  PriceListDetailPage,
  PriceListPreviewPage,
  PriceListsPage,
  PriceListUploadPage,
} from '../features/price-lists/pages/PriceListPages'
import {
  EstimateDetailPage,
  EstimateMatchingPage,
  EstimatePreviewPage,
  EstimatesPage,
  EstimateUploadPage,
} from '../features/estimates/pages/EstimatePages'

export default function App() {
  const pathname = usePathname()
  const route = resolveRoute(pathname)

  if (!route) {
    return (
      <AppLayout
        title="Страница не найдена"
        subtitle="Запрошенная страница отсутствует в текущей сборке frontend."
      >
        <div className="empty-state">
          <h3>Неизвестный маршрут</h3>
          <p>Используйте боковое меню, чтобы вернуться к разделам приложения.</p>
        </div>
      </AppLayout>
    )
  }

  switch (route.name) {
    case 'dashboard':
      return <DashboardPage />
    case 'suppliers':
      return <SuppliersPage />
    case 'catalog':
      return <CatalogPage />
    case 'projects':
      return <ProjectsPage />
    case 'price-lists':
      return <PriceListsPage />
    case 'price-lists-new':
      return <PriceListUploadPage />
    case 'price-lists-detail':
      return <PriceListDetailPage id={route.params.id} />
    case 'price-lists-preview':
      return <PriceListPreviewPage id={route.params.id} />
    case 'estimates':
      return <EstimatesPage />
    case 'estimates-new':
      return <EstimateUploadPage />
    case 'estimates-detail':
      return <EstimateDetailPage id={route.params.id} />
    case 'estimates-preview':
      return <EstimatePreviewPage id={route.params.id} />
    case 'estimates-matching':
      return <EstimateMatchingPage id={route.params.id} />
    default:
      return null
  }
}
