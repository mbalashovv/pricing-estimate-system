import { apiClient } from '../../shared/api/client'
import type { CatalogGroup, CatalogItem, PaginatedResponse } from '../../shared/types/api'

export function getCatalogGroups(search = '', page = 1) {
  return apiClient.get<PaginatedResponse<CatalogGroup>>('/catalog-groups/', { search, page })
}

export function createCatalogGroup(payload: Pick<CatalogGroup, 'name'>) {
  return apiClient.post<CatalogGroup>('/catalog-groups/', payload)
}

export function updateCatalogGroup(id: number, payload: Pick<CatalogGroup, 'name'>) {
  return apiClient.patch<CatalogGroup>(`/catalog-groups/${id}/`, payload)
}

export function deleteCatalogGroup(id: number) {
  return apiClient.delete(`/catalog-groups/${id}/`)
}

export function getCatalogItems(search = '', page = 1) {
  return apiClient.get<PaginatedResponse<CatalogItem>>('/catalog-items/', { search, page })
}

export function createCatalogItem(
  payload: Pick<CatalogItem, 'article' | 'name' | 'unit' | 'group'>,
) {
  return apiClient.post<CatalogItem>('/catalog-items/', payload)
}

export function updateCatalogItem(
  id: number,
  payload: Pick<CatalogItem, 'article' | 'name' | 'unit' | 'group'>,
) {
  return apiClient.patch<CatalogItem>(`/catalog-items/${id}/`, payload)
}

export function deleteCatalogItem(id: number) {
  return apiClient.delete(`/catalog-items/${id}/`)
}
