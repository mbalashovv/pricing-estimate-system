import axios from 'axios'
import { API_BASE_URL } from '../config/env'

type QueryValue = string | number | undefined | null

export class ApiError extends Error {
  status: number
  payload: unknown

  constructor(message: string, status: number, payload: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

const http = axios.create({
  baseURL: API_BASE_URL,
})

async function request<T>(
  path: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  data?: unknown,
  query?: Record<string, QueryValue>,
  headers?: Record<string, string>,
) {
  try {
    const response = await http.request<T>({
      url: path,
      method,
      data,
      headers,
      params: query,
      paramsSerializer: {
        serialize: (params) => {
          const searchParams = new URLSearchParams()

          Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
              searchParams.set(key, String(value))
            }
          })

          return searchParams.toString()
        },
      },
    })

    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const payload = error.response?.data
      throw new ApiError(extractErrorMessage(payload), error.response?.status ?? 0, payload)
    }

    throw new ApiError('Unknown API error.', 0, null)
  }
}

function extractErrorMessage(payload: unknown) {
  if (!payload) {
    return 'Unknown API error.'
  }

  if (typeof payload === 'string') {
    return payload
  }

  if (typeof payload === 'object' && payload !== null) {
    if ('detail' in payload && typeof payload.detail === 'string') {
      return payload.detail
    }

    return Object.entries(payload)
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
      .join(' | ')
  }

  return 'Unknown API error.'
}

export const apiClient = {
  get<T>(path: string, query?: Record<string, QueryValue>) {
    return request<T>(path, 'GET', undefined, query)
  },
  post<T>(path: string, body: unknown) {
    return request<T>(path, 'POST', body, undefined, { 'Content-Type': 'application/json' })
  },
  patch<T>(path: string, body: unknown) {
    return request<T>(path, 'PATCH', body, undefined, { 'Content-Type': 'application/json' })
  },
  delete(path: string) {
    return request<void>(path, 'DELETE')
  },
  upload<T>(path: string, formData: FormData) {
    return request<T>(path, 'POST', formData)
  },
}
