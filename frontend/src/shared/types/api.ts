export type PaginatedResponse<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export type Supplier = {
  id: number
  name: string
  inn: string
  currency: string
  created_at: string
  updated_at: string
}

export type CatalogGroup = {
  id: number
  name: string
  created_at: string
  updated_at: string
}

export type CatalogItem = {
  id: number
  article: string
  name: string
  unit: string
  group: number | null
  group_name?: string
  created_at: string
  updated_at: string
}

export type Project = {
  id: number
  name: string
  description: string
  created_at: string
  updated_at: string
}

export type ColumnDefinition = {
  index: number
  letter: string
  header: string
}

export type PreviewRow = {
  row_number: number
  values: Record<string, string>
}

export type ExcelPreviewResponse = {
  sheet_names: string[]
  selected_sheet: string
  header_row: number
  columns: ColumnDefinition[]
  rows: PreviewRow[]
}

export type PriceListItem = {
  id: number
  price_list: number
  catalog_item: number | null
  catalog_item_name?: string
  catalog_item_article?: string
  article: string
  name: string
  unit: string
  price: string
  match_status: string
  match_method: string
  match_confidence: string | null
  matched_at: string | null
  raw_data: Record<string, string>
  created_at: string
  updated_at: string
}

export type PriceList = {
  id: number
  supplier: number
  supplier_name: string
  name: string
  source_file: string
  column_mapping: {
    sheet?: string
    header_row?: number
    fields?: Record<string, string>
  }
  progress: number
  parse_task_id: string
  matching_status: string
  matching_progress: number
  matching_task_id: string
  status: string
  uploaded_at: string
  items_count: number
  created_at: string
  updated_at: string
}

export type PriceListDetail = PriceList & {
  parser_errors: string[]
  items: PriceListItem[]
}

export type EstimateItemMatch = {
  id: number
  catalog_item: number | null
  catalog_item_name: string
  catalog_item_article: string
  status: string
  method: string
  confidence: string | null
  note: string
  matched_at: string | null
}

export type EstimateItem = {
  id: number
  estimate: number
  article: string
  name: string
  unit: string
  quantity: string
  material_price: string | null
  labor_price: string | null
  match?: EstimateItemMatch
  raw_data: Record<string, string>
  created_at: string
  updated_at: string
}

export type Estimate = {
  id: number
  project: number
  project_name: string
  name: string
  source_file: string
  column_mapping: {
    sheet?: string
    header_row?: number
    fields?: Record<string, string>
  }
  progress: number
  parse_task_id: string
  matching_status: string
  matching_progress: number
  matching_task_id: string
  status: string
  uploaded_at: string
  items_count: number
  created_at: string
  updated_at: string
}

export type EstimateDetail = Estimate & {
  parser_errors: string[]
  items: EstimateItem[]
}
