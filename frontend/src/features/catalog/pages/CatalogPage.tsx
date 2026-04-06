import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppLayout } from '../../../app/layouts/AppLayout'
import {
  createCatalogGroup,
  createCatalogItem,
  deleteCatalogGroup,
  deleteCatalogItem,
  getCatalogGroups,
  getCatalogItems,
  updateCatalogGroup,
  updateCatalogItem,
} from '../api'
import type { CatalogGroup, CatalogItem } from '../../../shared/types/api'
import { formatDateTime } from '../../../shared/lib/format'
import { PaginationControls } from '../../../shared/ui/PaginationControls'
import { queryKeys } from '../../../shared/api/queryKeys'

const groupFormInitial = { name: '' }
const itemFormInitial = { article: '', name: '', unit: '', group: '' }

export function CatalogPage() {
  const [tab, setTab] = useState<'groups' | 'items'>('items')
  const [groupSearch, setGroupSearch] = useState('')
  const [itemSearch, setItemSearch] = useState('')
  const [groupPage, setGroupPage] = useState(1)
  const [itemPage, setItemPage] = useState(1)
  const [selectedGroup, setSelectedGroup] = useState<CatalogGroup | null>(null)
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null)
  const [groupForm, setGroupForm] = useState(groupFormInitial)
  const [itemForm, setItemForm] = useState(itemFormInitial)
  const [notice, setNotice] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const groupsQuery = useQuery({
    queryKey: queryKeys.catalogGroups(groupSearch, groupPage),
    queryFn: () => getCatalogGroups(groupSearch, groupPage),
  })

  const itemsQuery = useQuery({
    queryKey: queryKeys.catalogItems(itemSearch, itemPage),
    queryFn: () => getCatalogItems(itemSearch, itemPage),
  })

  const groupOptions = useMemo(
    () => (groupsQuery.data?.results ?? []).map((group) => ({ label: group.name, value: String(group.id) })),
    [groupsQuery.data?.results],
  )

  const saveGroupMutation = useMutation({
    mutationFn: (payload: typeof groupFormInitial) =>
      selectedGroup ? updateCatalogGroup(selectedGroup.id, payload) : createCatalogGroup(payload),
    onSuccess: async () => {
      setSelectedGroup(null)
      setGroupForm(groupFormInitial)
      setNotice(selectedGroup ? 'Catalog group updated.' : 'Catalog group created.')
      await queryClient.invalidateQueries({ queryKey: ['catalog-groups'] })
    },
  })

  const deleteGroupMutation = useMutation({
    mutationFn: (id: number) => deleteCatalogGroup(id),
    onSuccess: async () => {
      setSelectedGroup(null)
      setGroupForm(groupFormInitial)
      setNotice('Catalog group deleted.')
      await queryClient.invalidateQueries({ queryKey: ['catalog-groups'] })
    },
  })

  const saveItemMutation = useMutation({
    mutationFn: () => {
      const payload = {
        article: itemForm.article,
        name: itemForm.name,
        unit: itemForm.unit,
        group: itemForm.group ? Number(itemForm.group) : null,
      }
      return selectedItem ? updateCatalogItem(selectedItem.id, payload) : createCatalogItem(payload)
    },
    onSuccess: async () => {
      setSelectedItem(null)
      setItemForm(itemFormInitial)
      setNotice(selectedItem ? 'Catalog item updated.' : 'Catalog item created.')
      await queryClient.invalidateQueries({ queryKey: ['catalog-items'] })
    },
  })

  const deleteItemMutation = useMutation({
    mutationFn: (id: number) => deleteCatalogItem(id),
    onSuccess: async () => {
      setSelectedItem(null)
      setItemForm(itemFormInitial)
      setNotice('Catalog item deleted.')
      await queryClient.invalidateQueries({ queryKey: ['catalog-items'] })
    },
  })

  const onSaveGroup = async (event: FormEvent) => {
    event.preventDefault()
    await saveGroupMutation.mutateAsync(groupForm).catch(() => setNotice(null))
  }

  const onSaveItem = async (event: FormEvent) => {
    event.preventDefault()
    await saveItemMutation.mutateAsync().catch(() => setNotice(null))
  }

  const error =
    (groupsQuery.error as Error | null)?.message ||
    (itemsQuery.error as Error | null)?.message ||
    (saveGroupMutation.error as Error | null)?.message ||
    (deleteGroupMutation.error as Error | null)?.message ||
    (saveItemMutation.error as Error | null)?.message ||
    (deleteItemMutation.error as Error | null)?.message ||
    null
  const saving =
    saveGroupMutation.isPending ||
    deleteGroupMutation.isPending ||
    saveItemMutation.isPending ||
    deleteItemMutation.isPending

  return (
    <AppLayout
      title="Каталог"
      subtitle="Управление группами и позициями каталога, используемыми при сопоставлении."
      actions={
        <div className="segmented-control">
          <button className={tab === 'items' ? 'is-active' : ''} onClick={() => setTab('items')}>
            Позиции
          </button>
          <button className={tab === 'groups' ? 'is-active' : ''} onClick={() => setTab('groups')}>
            Группы
          </button>
        </div>
      }
    >
      {notice ? <div className="alert alert-success">{notice}</div> : null}
      {error ? <div className="alert alert-error">{error}</div> : null}

      {tab === 'groups' ? (
        <section className="grid two-column">
          <article className="card">
            <div className="toolbar">
            <input
              className="input"
              placeholder="Поиск групп"
              value={groupSearch}
              onChange={(event) => setGroupSearch(event.target.value)}
            />
            <button className="button" onClick={() => setGroupPage(1)}>
              Найти
            </button>
          </div>

            <div className="table-wrap">
              <table>
                <thead>
                <tr>
                    <th>Название</th>
                    <th>Создана</th>
                  </tr>
                </thead>
                <tbody>
                  {groupsQuery.isLoading || groupsQuery.isFetching ? (
                    <tr>
                      <td colSpan={2} className="muted">
                        Загрузка групп...
                      </td>
                    </tr>
                  ) : (groupsQuery.data?.results ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={2} className="muted">
                        Группы не найдены.
                      </td>
                    </tr>
                  ) : (
                    (groupsQuery.data?.results ?? []).map((group) => (
                      <tr
                        key={group.id}
                        onClick={() => {
                          setSelectedGroup(group)
                          setGroupForm({ name: group.name })
                        }}
                        className={selectedGroup?.id === group.id ? 'is-selected' : ''}
                      >
                        <td>{group.name}</td>
                        <td>{formatDateTime(group.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <PaginationControls
              count={groupsQuery.data?.count ?? 0}
              page={groupPage}
              hasNext={Boolean(groupsQuery.data?.next)}
              hasPrevious={Boolean(groupsQuery.data?.previous)}
              loading={groupsQuery.isLoading || groupsQuery.isFetching}
              onPageChange={setGroupPage}
            />
          </article>

          <article className="card">
            <div className="split-header">
              <h2>{selectedGroup ? 'Редактирование группы' : 'Создание группы'}</h2>
              {selectedGroup ? (
                <button
                  className="button button-ghost"
                  onClick={() => {
                    setSelectedGroup(null)
                    setGroupForm(groupFormInitial)
                  }}
                >
                  Новая
                </button>
              ) : null}
            </div>

            <form className="form-grid" onSubmit={onSaveGroup}>
              <label className="field">
                <span>Название</span>
                <input
                  className="input"
                  value={groupForm.name}
                  onChange={(event) => setGroupForm({ name: event.target.value })}
                  required
                />
              </label>

              <div className="button-row">
                <button className="button button-primary" type="submit" disabled={saving}>
                  {saving ? 'Сохранение...' : selectedGroup ? 'Сохранить изменения' : 'Создать группу'}
                </button>
                {selectedGroup ? (
                  <button
                    className="button button-danger"
                    type="button"
                    disabled={saving}
                    onClick={() => void deleteGroupMutation.mutateAsync(selectedGroup.id)}
                  >
                    Удалить
                  </button>
                ) : null}
              </div>
            </form>
          </article>
        </section>
      ) : (
        <section className="grid two-column">
          <article className="card">
            <div className="toolbar">
            <input
              className="input"
              placeholder="Поиск позиций"
              value={itemSearch}
              onChange={(event) => setItemSearch(event.target.value)}
            />
            <button className="button" onClick={() => setItemPage(1)}>
              Найти
            </button>
          </div>

            <div className="table-wrap">
              <table>
                <thead>
                <tr>
                    <th>Артикул</th>
                    <th>Название</th>
                    <th>Ед. изм.</th>
                    <th>Группа</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsQuery.isLoading || itemsQuery.isFetching ? (
                    <tr>
                      <td colSpan={4} className="muted">
                        Загрузка позиций...
                      </td>
                    </tr>
                  ) : (itemsQuery.data?.results ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="muted">
                        Позиции не найдены.
                      </td>
                    </tr>
                  ) : (
                    (itemsQuery.data?.results ?? []).map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => {
                          setSelectedItem(item)
                          setItemForm({
                            article: item.article,
                            name: item.name,
                            unit: item.unit,
                            group: item.group ? String(item.group) : '',
                          })
                        }}
                        className={selectedItem?.id === item.id ? 'is-selected' : ''}
                      >
                        <td>{item.article || '—'}</td>
                        <td>{item.name}</td>
                        <td>{item.unit || '—'}</td>
                        <td>{item.group_name || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <PaginationControls
              count={itemsQuery.data?.count ?? 0}
              page={itemPage}
              hasNext={Boolean(itemsQuery.data?.next)}
              hasPrevious={Boolean(itemsQuery.data?.previous)}
              loading={itemsQuery.isLoading || itemsQuery.isFetching}
              onPageChange={setItemPage}
            />
          </article>

          <article className="card">
            <div className="split-header">
              <h2>{selectedItem ? 'Редактирование позиции' : 'Создание позиции'}</h2>
              {selectedItem ? (
                <button
                  className="button button-ghost"
                  onClick={() => {
                    setSelectedItem(null)
                    setItemForm(itemFormInitial)
                  }}
                >
                  Новая
                </button>
              ) : null}
            </div>

            <form className="form-grid" onSubmit={onSaveItem}>
              <label className="field">
                <span>Артикул</span>
                <input
                  className="input"
                  value={itemForm.article}
                  onChange={(event) =>
                    setItemForm((current) => ({ ...current, article: event.target.value }))
                  }
                />
              </label>

              <label className="field">
                <span>Название</span>
                <input
                  className="input"
                  value={itemForm.name}
                  onChange={(event) =>
                    setItemForm((current) => ({ ...current, name: event.target.value }))
                  }
                  required
                />
              </label>

              <label className="field">
                <span>Ед. изм.</span>
                <input
                  className="input"
                  value={itemForm.unit}
                  onChange={(event) =>
                    setItemForm((current) => ({ ...current, unit: event.target.value }))
                  }
                />
              </label>

              <label className="field">
                <span>Группа</span>
                <select
                  className="input"
                  value={itemForm.group}
                  onChange={(event) =>
                    setItemForm((current) => ({ ...current, group: event.target.value }))
                  }
                >
                  <option value="">Без группы</option>
                  {groupOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="button-row">
                <button className="button button-primary" type="submit" disabled={saving}>
                  {saving ? 'Сохранение...' : selectedItem ? 'Сохранить изменения' : 'Создать позицию'}
                </button>
                {selectedItem ? (
                  <button
                    className="button button-danger"
                    type="button"
                    disabled={saving}
                    onClick={() => void deleteItemMutation.mutateAsync(selectedItem.id)}
                  >
                    Удалить
                  </button>
                ) : null}
              </div>
            </form>
          </article>
        </section>
      )}
    </AppLayout>
  )
}
