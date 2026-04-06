import type { PropsWithChildren, ReactNode } from 'react'
import { navItems, navigate, usePathname } from '../router/router'

type AppLayoutProps = PropsWithChildren<{
  title: string
  subtitle?: string
  actions?: ReactNode
}>

export function AppLayout({ title, subtitle, actions, children }: AppLayoutProps) {
  const pathname = usePathname()

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => navigate('/')}>
          <span className="brand-mark">₽</span>
          <span>
            <strong>Прайсы и сметы</strong>
            <small>Панель управления</small>
          </span>
        </button>

        <nav className="nav-list" aria-label="Основная навигация">
          {navItems.map((item) => {
            const active =
              item.href === '/'
                ? pathname === '/'
                : pathname === item.href || pathname.startsWith(`${item.href}/`)

            return (
              <button
                key={item.href}
                className={`nav-item${active ? ' is-active' : ''}`}
                onClick={() => navigate(item.href)}
              >
                <span className="nav-label">{item.label}</span>
                <span className="nav-note">{item.note}</span>
              </button>
            )
          })}
        </nav>
      </aside>

      <main className="main-panel">
        <header className="page-header">
          <div>
            <p className="eyebrow">Система расчета цен и смет</p>
            <h1>{title}</h1>
            {subtitle ? <p className="subtitle">{subtitle}</p> : null}
          </div>
          {actions ? <div className="page-actions">{actions}</div> : null}
        </header>

        <div className="page-content">{children}</div>
      </main>
    </div>
  )
}
