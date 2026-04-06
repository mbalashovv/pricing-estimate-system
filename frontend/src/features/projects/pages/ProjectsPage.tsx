import type { FormEvent } from 'react'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppLayout } from '../../../app/layouts/AppLayout'
import { createProject, deleteProject, getProjects, updateProject } from '../api'
import type { Project } from '../../../shared/types/api'
import { formatDateTime } from '../../../shared/lib/format'
import { PaginationControls } from '../../../shared/ui/PaginationControls'
import { queryKeys } from '../../../shared/api/queryKeys'

const initialForm = { name: '', description: '' }

export function ProjectsPage() {
  const [selected, setSelected] = useState<Project | null>(null)
  const [form, setForm] = useState(initialForm)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [notice, setNotice] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const projectsQuery = useQuery({
    queryKey: queryKeys.projects(search, page),
    queryFn: () => getProjects(search, page),
  })

  const saveMutation = useMutation({
    mutationFn: (payload: typeof form) =>
      selected ? updateProject(selected.id, payload) : createProject(payload),
    onSuccess: async () => {
      setSelected(null)
      setForm(initialForm)
      setNotice(selected ? 'Project updated.' : 'Project created.')
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteProject(id),
    onSuccess: async () => {
      setSelected(null)
      setForm(initialForm)
      setNotice('Project deleted.')
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    await saveMutation.mutateAsync(form)
  }

  const items = projectsQuery.data?.results ?? []
  const error =
    (projectsQuery.error as Error | null)?.message ||
    (saveMutation.error as Error | null)?.message ||
    (deleteMutation.error as Error | null)?.message ||
    null
  const loading = projectsQuery.isLoading || projectsQuery.isFetching
  const saving = saveMutation.isPending || deleteMutation.isPending

  return (
    <AppLayout title="Проекты" subtitle="Проекты объединяют сметы и используются в дальнейшем процессе сопоставления.">
      {notice ? <div className="alert alert-success">{notice}</div> : null}
      {error ? <div className="alert alert-error">{error}</div> : null}

      <section className="grid two-column">
        <article className="card">
          <div className="toolbar">
            <input
              className="input"
              placeholder="Поиск проектов"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <button className="button" onClick={() => setPage(1)}>
              Найти
            </button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Название</th>
                  <th>Описание</th>
                  <th>Создан</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} className="muted">
                      Загрузка проектов...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="muted">
                      Проекты не найдены.
                    </td>
                  </tr>
                ) : (
                  items.map((project) => (
                    <tr
                      key={project.id}
                      onClick={() => {
                        setSelected(project)
                        setForm({ name: project.name, description: project.description })
                      }}
                      className={selected?.id === project.id ? 'is-selected' : ''}
                    >
                      <td>{project.name}</td>
                      <td>{project.description || '—'}</td>
                      <td>{formatDateTime(project.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <PaginationControls
            count={projectsQuery.data?.count ?? 0}
            page={page}
            hasNext={Boolean(projectsQuery.data?.next)}
            hasPrevious={Boolean(projectsQuery.data?.previous)}
            loading={loading}
            onPageChange={setPage}
          />
        </article>

        <article className="card">
          <div className="split-header">
            <h2>{selected ? 'Редактирование проекта' : 'Создание проекта'}</h2>
            {selected ? (
              <button
                className="button button-ghost"
                onClick={() => {
                  setSelected(null)
                  setForm(initialForm)
                }}
              >
                Новый
              </button>
            ) : null}
          </div>
          <form className="form-grid" onSubmit={onSubmit}>
            <label className="field">
              <span>Название</span>
              <input
                className="input"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </label>

            <label className="field">
              <span>Описание</span>
              <textarea
                className="input textarea"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </label>

            <div className="button-row">
              <button className="button button-primary" type="submit" disabled={saving}>
                {saving ? 'Сохранение...' : selected ? 'Сохранить изменения' : 'Создать проект'}
              </button>
              {selected ? (
                <button
                  className="button button-danger"
                  type="button"
                  disabled={saving}
                  onClick={() => void deleteMutation.mutateAsync(selected.id)}
                >
                  Удалить
                </button>
              ) : null}
            </div>
          </form>
        </article>
      </section>
    </AppLayout>
  )
}
