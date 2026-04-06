export const queryKeys = {
  dashboard: ['dashboard'] as const,
  suppliers: (search = '', page = 1) => ['suppliers', search, page] as const,
  supplier: (id: number | string) => ['supplier', id] as const,
  catalogGroups: (search = '', page = 1) => ['catalog-groups', search, page] as const,
  catalogItems: (search = '', page = 1) => ['catalog-items', search, page] as const,
  projects: (search = '', page = 1) => ['projects', search, page] as const,
  priceLists: (search = '', page = 1) => ['price-lists', search, page] as const,
  priceList: (id: number | string) => ['price-list', id] as const,
  priceListPreview: (id: number | string, sheet = '', headerRow = 1) =>
    ['price-list-preview', id, sheet, headerRow] as const,
  estimates: (search = '', page = 1) => ['estimates', search, page] as const,
  estimate: (id: number | string) => ['estimate', id] as const,
  estimatePreview: (id: number | string, sheet = '', headerRow = 1) =>
    ['estimate-preview', id, sheet, headerRow] as const,
} as const
