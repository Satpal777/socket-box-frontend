import { useState } from 'react'
import CheckboxGrid from './components/CheckboxGrid'
import Login from './Login'
import Callback from './Callback'

interface Stats {
  onlineCount: number
  connected: boolean
  checkedCount: number
  totalCount: number
}

function MainApp() {
  // TODO: We could use the user profile fetched from Aura Auth here instead of random ID.
  const [userId] = useState(() => `user-${Math.random().toString(36).substr(2, 9)}`)
  const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userId)}`
  const [stats, setStats] = useState<Stats>({ onlineCount: 0, connected: false, checkedCount: 0, totalCount: 0 })

  const handleLogout = () => {
    localStorage.removeItem('aura_token');
    localStorage.removeItem('aura_user');
    window.location.href = '/';
  };

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
          <button 
            onClick={handleLogout} 
            style={{ 
              background: 'rgba(255, 255, 255, 0.05)', 
              border: '1px solid var(--border)', 
              color: 'var(--text-secondary)', 
              padding: '6px 14px', 
              borderRadius: '100px', 
              cursor: 'pointer', 
              fontSize: '0.82rem', 
              fontWeight: 500,
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(248, 113, 113, 0.1)'; e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(248, 113, 113, 0.3)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            Sign out
          </button>
        </div>
      </header>

      <CheckboxGrid userId={userId} onStatsChange={setStats} />
    </div>
  )
}

function App() {
  const path = window.location.pathname;

  if (path === '/callback') {
    return <Callback />;
  }

  const token = localStorage.getItem('aura_token');
  if (!token) {
    return <Login />;
  }

  return <MainApp />;
}

export default App
