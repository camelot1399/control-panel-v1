import { useEffect, useState } from 'react'

type Service = { id: string; name: string; icon: string; port: number; running: boolean }
type LintResult = { success: boolean; output: string }

export default function App() {
  const [services, setServices] = useState<Service[]>([])
  const [activeId, setActiveId] = useState('service-one')
  const [loading, setLoading] = useState(false)
  const [linting, setLinting] = useState(false)
  const [lintResults, setLintResults] = useState<Record<string, LintResult>>({})

  const refresh = async () => {
    const response = await fetch('/api/services/')
    setServices(await response.json())
  }

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void refresh(), 0)
    const timer = window.setInterval(() => void refresh(), 2000)
    return () => {
      window.clearTimeout(initialLoad)
      window.clearInterval(timer)
    }
  }, [])

  const active = services.find(({ id }) => id === activeId)
  const control = async (action: 'start' | 'stop') => {
    setLoading(true)
    try {
      await fetch(`/api/services/${activeId}/${action}`, { method: 'POST' })
      await refresh()
    } finally {
      setLoading(false)
    }
  }

  const lint = async () => {
    const serviceId = activeId
    setLinting(true)
    setLintResults((current) => {
      const next = { ...current }
      delete next[serviceId]
      return next
    })
    try {
      const response = await fetch(`/api/services/${serviceId}/lint`, { method: 'POST' })
      const result: LintResult = await response.json()
      setLintResults((current) => ({ ...current, [serviceId]: result }))
    } catch {
      setLintResults((current) => ({
        ...current,
        [serviceId]: { success: false, output: 'Не удалось запустить линтер.' },
      }))
    } finally {
      setLinting(false)
    }
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">CP</div>
        <nav aria-label="Сервисы">
          {services.map((service) => (
            <button
              key={service.id}
              className={service.id === activeId ? 'nav-item active' : 'nav-item'}
              onClick={() => setActiveId(service.id)}
              title={service.name}
            >
              <span>{service.icon}</span>
              <i className={service.running ? 'dot running' : 'dot'} />
            </button>
          ))}
        </nav>
      </aside>
      <section className="content">
        {active ? (
          <>
            <p className="eyebrow">Управление сервисом</p>
            <h1>{active.name}</h1>
            <div className="status-card">
              <div>
                <p className="label">Статус</p>
                <p className={active.running ? 'status online' : 'status offline'}>
                  <i />
                  {active.running ? 'Запущен' : 'Остановлен'}
                </p>
              </div>
              <div>
                <p className="label">Порт</p>
                <p className="port">localhost:{active.port}</p>
              </div>
            </div>
            <div className="actions">
              <button
                className="start"
                disabled={active.running || loading}
                onClick={() => void control('start')}
              >
                Запустить
              </button>
              <button
                className="stop"
                disabled={!active.running || loading}
                onClick={() => void control('stop')}
              >
                Остановить
              </button>
              <button className="lint" disabled={linting} onClick={() => void lint()}>
                {linting ? 'Проверяем…' : 'Проверить код'}
              </button>
            </div>
            {lintResults[activeId] && (
              <section
                className={
                  lintResults[activeId].success ? 'lint-result success' : 'lint-result error'
                }
              >
                <p>
                  {lintResults[activeId].success
                    ? 'Линтер: без ошибок'
                    : 'Линтер обнаружил проблемы'}
                </p>
                <pre>{lintResults[activeId].output}</pre>
              </section>
            )}
          </>
        ) : (
          <p>Загрузка сервисов…</p>
        )}
      </section>
    </main>
  )
}
