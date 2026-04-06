import { apiClient } from '../../shared/api/client'
import type { PaginatedResponse, Supplier } from '../../shared/types/api'

export function getSuppliers(search = '', page = 1) {
  return apiClient.get<PaginatedResponse<Supplier>>('/suppliers/', { search, page })
}

export function getSupplier(id: number | string) {
  return apiClient.get<Supplier>(`/suppliers/${id}/`)
}

export function createSupplier(payload: Pick<Supplier, 'name' | 'inn' | 'currency'>) {
  return apiClient.post<Supplier>('/suppliers/', payload)
}

export function updateSupplier(id: number, payload: Pick<Supplier, 'name' | 'inn' | 'currency'>) {
  return apiClient.patch<Supplier>(`/suppliers/${id}/`, payload)
}

export function deleteSupplier(id: number) {
  return apiClient.delete(`/suppliers/${id}/`)
}
