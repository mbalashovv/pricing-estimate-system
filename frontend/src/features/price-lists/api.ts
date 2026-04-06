import { apiClient } from '../../shared/api/client'
import type {
  ExcelPreviewResponse,
  PaginatedResponse,
  PriceList,
  PriceListDetail,
} from '../../shared/types/api'

export function getPriceLists(search = '', page = 1) {
  return apiClient.get<PaginatedResponse<PriceList>>('/price-lists/', { search, page })
}

export function getPriceList(id: string | number) {
  return apiClient.get<PriceListDetail>(`/price-lists/${id}/`)
}

export function createPriceList(formData: FormData) {
  return apiClient.upload<PriceList>(`/price-lists/`, formData)
}

export function getPriceListPreview(id: string | number, sheet?: string, headerRow = 1) {
  return apiClient.get<ExcelPreviewResponse>(`/price-lists/${id}/preview/`, {
    sheet,
    header_row: headerRow,
  })
}

export function savePriceListMapping(id: string | number, payload: Record<string, unknown>) {
  return apiClient.post(`/price-lists/${id}/mapping/`, payload)
}

export function startPriceListParse(id: string | number) {
  return apiClient.post(`/price-lists/${id}/parse/`, {})
}

export function startPriceListMatch(id: string | number) {
  return apiClient.post(`/price-lists/${id}/match/`, {})
}

export function setPriceListItemMatch(id: number, catalogItem: number) {
  return apiClient.post(`/price-list-items/${id}/set-match/`, {
    catalog_item: catalogItem,
  })
}

export function markPriceListItemNoMatch(id: number) {
  return apiClient.post(`/price-list-items/${id}/mark-no-match/`, {})
}
