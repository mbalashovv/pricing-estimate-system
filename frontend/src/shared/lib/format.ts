export function formatDateTime(value?: string | null) {
  if (!value) {
    return '—'
  }

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

const supportedCurrencies = new Set(['RUB', 'USD', 'EUR'])

export function formatMoney(value?: string | number | null, currency?: string | null) {
  if (value === null || value === undefined || value === '') {
    return '—'
  }

  if (!currency || !supportedCurrencies.has(currency)) {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(Number(value))
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value))
}

export function formatNumber(value?: string | number | null) {
  if (value === null || value === undefined || value === '') {
    return '—'
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 3,
  }).format(Number(value))
}

export function statusTone(status: string) {
  if (status === 'completed' || status === 'matched' || status === 'manual') {
    return 'success'
  }
  if (status === 'failed' || status === 'no_match' || status === 'not_matched') {
    return 'danger'
  }
  if (status === 'needs_review') {
    return 'warning'
  }
  return 'neutral'
}

export function getPriceListMatchStatusLabel(status?: string | null) {
  switch (status) {
    case 'matched':
      return 'Сопоставлено'
    case 'needs_review':
      return 'Требует проверки'
    case 'not_matched':
      return 'Не сопоставлено'
    case 'manual':
      return 'Ручное'
    case 'processing':
      return 'В процессе'
    case 'pending':
      return 'Ожидает'
    case 'completed':
      return 'Завершено'
    case 'failed':
      return 'Ошибка'
    default:
      return status || '—'
  }
}

export function getMatchMethodLabel(method?: string | null) {
  switch (method) {
    case 'ai':
      return 'AI'
    case 'manual':
      return 'Вручную'
    case 'article':
      return 'По артикулу'
    case 'fuzzy':
      return 'Нечеткое'
    default:
      return method || '—'
  }
}
