import { useEffect, useState } from 'react'

type RouteDef = {
  name: string
  pattern: string
}

const routes: RouteDef[] = [
  { name: 'dashboard', pattern: '/' },
  { name: 'suppliers', pattern: '/suppliers' },
  { name: 'catalog', pattern: '/catalog' },
  { name: 'projects', pattern: '/projects' },
  { name: 'price-lists', pattern: '/price-lists' },
  { name: 'price-lists-new', pattern: '/price-lists/new' },
  { name: 'price-lists-preview', pattern: '/price-lists/:id/preview' },
  { name: 'price-lists-detail', pattern: '/price-lists/:id' },
  { name: 'estimates', pattern: '/estimates' },
  { name: 'estimates-new', pattern: '/estimates/new' },
  { name: 'estimates-preview', pattern: '/estimates/:id/preview' },
  { name: 'estimates-matching', pattern: '/estimates/:id/matching' },
  { name: 'estimates-detail', pattern: '/estimates/:id' },
]

export const navItems = [
  { href: '/', label: 'Панель управления', note: 'Обзор системы' },
  { href: '/suppliers', label: 'Поставщики', note: 'Справочные данные' },
  { href: '/catalog', label: 'Каталог', note: 'Группы и позиции' },
  { href: '/projects', label: 'Проекты', note: 'Контейнеры смет' },
  { href: '/price-lists', label: 'Прайс-листы', note: 'Загрузка и разбор' },
  { href: '/estimates', label: 'Сметы', note: 'Разбор и сопоставление' },
]

function getCurrentPathname() {
  return window.location.pathname || '/'
}

export function navigate(pathname: string) {
  if (pathname === getCurrentPathname()) {
    return
  }

  window.history.pushState({}, '', pathname)
  window.dispatchEvent(new Event('app:navigate'))
}

export function usePathname() {
  const [pathname, setPathname] = useState(getCurrentPathname())

  useEffect(() => {
    const handleChange = () => setPathname(getCurrentPathname())

    window.addEventListener('popstate', handleChange)
    window.addEventListener('app:navigate', handleChange)
    return () => {
      window.removeEventListener('popstate', handleChange)
      window.removeEventListener('app:navigate', handleChange)
    }
  }, [])

  return pathname
}

export function resolveRoute(pathname: string) {
  for (const route of routes) {
    const match = matchRoute(route.pattern, pathname)
    if (match) {
      return { name: route.name, params: match }
    }
  }

  return null
}

function matchRoute(pattern: string, pathname: string) {
  const patternParts = trim(pattern).split('/').filter(Boolean)
  const pathParts = trim(pathname).split('/').filter(Boolean)

  if (patternParts.length !== pathParts.length) {
    return pattern === pathname ? {} : null
  }

  const params: Record<string, string> = {}

  for (let index = 0; index < patternParts.length; index += 1) {
    const currentPattern = patternParts[index]
    const currentPath = pathParts[index]

    if (currentPattern.startsWith(':')) {
      params[currentPattern.slice(1)] = currentPath
      continue
    }

    if (currentPattern !== currentPath) {
      return null
    }
  }

  return params
}

function trim(value: string) {
  if (value === '/') {
    return value
  }

  return value.replace(/\/+$/, '')
}
