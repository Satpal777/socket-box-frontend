import { useState } from 'react'
import CheckboxGrid from './components/CheckboxGrid'

interface Stats {
  onlineCount: number
  connected: boolean
  checkedCount: number
  totalCount: number
}

function App() {
  const [userId] = useState(() => `user-${Math.random().toString(36).substr(2, 9)}`)
  const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userId)}`
  const [stats, setStats] = useState<Stats>({ onlineCount: 0, connected: false, checkedCount: 0, totalCount: 0 })

  return (
    <div className="app">
      <header>
        <div className="header-brand">
          <div className="header-avatar-wrap">
            <img src={avatarUrl} alt="Your avatar" className="header-avatar" />
            <span className="online-dot" aria-hidden="true" />
          </div>
          <div className="header-title">
            <h1>Emitly</h1>
            <span>Real-time collaborative checkbox grid</span>
          </div>
        </div>

        <div className="stats-bar" role="status" aria-live="polite" aria-label="Live statistics">
          <div className="stat-pill online" title="People currently online">
            <span className="dot" aria-hidden="true" />
            <strong>{stats.onlineCount}</strong>
            <span>{stats.onlineCount === 1 ? 'person' : 'people'} online</span>
          </div>
          <div className="stat-pill checked" title="Checked boxes out of total">
            <span className="dot" aria-hidden="true" />
            <strong>{stats.checkedCount}</strong>
            <span>/ {stats.totalCount} checked</span>
          </div>
          <div className={`conn-badge ${stats.connected ? 'connected' : 'disconnected'}`} aria-label={stats.connected ? 'Connected' : 'Disconnected'}>
            <span className="dot" aria-hidden="true" />
            {stats.connected ? 'Live' : 'Offline'}
          </div>
        </div>
      </header>

      <CheckboxGrid userId={userId} onStatsChange={setStats} />
    </div>
  )
}

export default App
