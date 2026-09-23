import { useState, useEffect } from 'react'
import ThemeToggle from './ThemeToggle'
import { exportCalendarExcel, exportAllBackup } from '../utils/export'

function timeAgo(ts) {
  if (!ts) return ''
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000))
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  return `${Math.floor(s / 60)}m ago`
}

export default function Header({ onPrint, theme, onToggleTheme, printDateLabel, events, inventory, dbStatus, syncing, soundOn, onToggleSound, lastSyncAt, activeTab, onNavChange }) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 5000)
    return () => clearInterval(t)
  }, [])
  return (
    <header className="app-header">
      <div className="header-left">
        <div className="logo-mark">💧</div>
        <div className="header-title">
          <h1>Tubig Irosin Inventory</h1>
          <p>
            <span className="dot" style={{ background: dbStatus?.color || '#22c55e' }}></span>
            {dbStatus?.label || 'Water Refilling Station • Irosin, Sorsogon • Offline Ready'}
            {syncing && <span style={{ marginLeft: 8, background: '#0f172a', color: 'white', padding: '1px 6px', borderRadius: 999, fontSize: 10 }}>Syncing…</span>}
            {!!lastSyncAt && !syncing && (
              <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--slate-500)', fontWeight: 600 }} title="Statuses auto-refresh continuously — no manual reload needed">
                <span className="dot" style={{ background: '#22c55e' }}></span> Live • {timeAgo(lastSyncAt)}
              </span>
            )}
          </p>
        </div>
      </div>
      <div className="header-actions">
        <button className={`btn btn-ghost ${activeTab === 'calendar' ? 'active' : ''}`} onClick={() => onNavChange?.('calendar')} title="Calendar — sales & schedule">📅 Calendar</button>
        <button className={`btn btn-ghost ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => onNavChange?.('reports')} title="Reports — analytics">📈 Reports</button>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        <button className="btn btn-ghost" onClick={onToggleSound} title={soundOn ? 'Sound ON — click to mute' : 'Sound OFF — click to enable'} aria-label={soundOn ? 'Mute sound' : 'Enable sound'} style={{ background: soundOn ? 'var(--blue-50)' : 'var(--white)', borderColor: soundOn ? 'var(--blue-100)' : 'var(--slate-200)' }}>{soundOn ? '🔔' : '🔕'}</button>
        <button className="btn btn-ghost" onClick={onPrint} title={`Print daily sheet for ${printDateLabel}`}>
          🖨 Print Sheet
        </button>
        <button className="btn btn-ghost" onClick={() => { if (events) exportCalendarExcel(events); }} title="Download spreadsheet">⬇ Export</button>
        <button className="btn btn-ghost" onClick={() => { if (events && inventory) exportAllBackup({ events, inventory }) }} title="Download backup">⬇ Backup</button>
      </div>
    </header>
  )
}
