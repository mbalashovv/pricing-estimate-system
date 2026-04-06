import { apiClient } from '../../shared/api/client'
import type { PaginatedResponse, Project } from '../../shared/types/api'

export function getProjects(search = '', page = 1) {
  return apiClient.get<PaginatedResponse<Project>>('/projects/', { search, page })
}

export function createProject(payload: Pick<Project, 'name' | 'description'>) {
  return apiClient.post<Project>('/projects/', payload)
}

export function updateProject(id: number, payload: Pick<Project, 'name' | 'description'>) {
  return apiClient.patch<Project>(`/projects/${id}/`, payload)
}

export function deleteProject(id: number) {
  return apiClient.delete(`/projects/${id}/`)
}
