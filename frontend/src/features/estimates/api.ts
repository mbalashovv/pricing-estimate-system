import { apiClient } from '../../shared/api/client'
import type {
  Estimate,
  EstimateDetail,
  ExcelPreviewResponse,
  PaginatedResponse,
} from '../../shared/types/api'

export function getEstimates(search = '', page = 1) {
  return apiClient.get<PaginatedResponse<Estimate>>('/estimates/', { search, page })
}

export function getEstimate(id: string | number) {
  return apiClient.get<EstimateDetail>(`/estimates/${id}/`)
}

export function createEstimate(formData: FormData) {
  return apiClient.upload<Estimate>('/estimates/', formData)
}

export function getEstimatePreview(id: string | number, sheet?: string, headerRow = 1) {
  return apiClient.get<ExcelPreviewResponse>(`/estimates/${id}/preview/`, {
    sheet,
    header_row: headerRow,
  })
}

export function saveEstimateMapping(id: string | number, payload: Record<string, unknown>) {
  return apiClient.post(`/estimates/${id}/mapping/`, payload)
}

export function startEstimateParse(id: string | number) {
  return apiClient.post(`/estimates/${id}/parse/`, {})
}

export function startEstimateMatching(id: string | number) {
  return apiClient.post(`/estimates/${id}/match/`, {})
}

export function setEstimateItemMatch(id: number, catalogItem: number, note = 'Manual match from frontend.') {
  return apiClient.post(`/estimate-items/${id}/set-match/`, {
    catalog_item: catalogItem,
    note,
  })
}

export function markEstimateItemNoMatch(id: number, note = 'Marked as no match from frontend.') {
  return apiClient.post(`/estimate-items/${id}/mark-no-match/`, { note })
}
