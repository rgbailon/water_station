import ThemeToggle from './ThemeToggle'
import { exportCalendarExcel, exportAllBackup } from '../utils/export'

export default function Header({ onPrint, theme, onToggleTheme, printDateLabel, events, inventory, dbStatus, syncing, soundOn, onToggleSound }) {
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
          </p>
        </div>
      </div>
      <div className="header-actions">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        <button className="btn btn-ghost" onClick={onToggleSound} title={soundOn ? 'Sound ON — click to mute' : 'Sound OFF — click to enable'} style={{ background: soundOn ? 'var(--blue-50)' : 'var(--white)', borderColor: soundOn ? 'var(--blue-100)' : 'var(--slate-200)' }}>{soundOn ? '🔔 Sound' : '🔕 Muted'}</button>
        <button className="btn btn-ghost" onClick={onPrint} title={`Print daily sheet for ${printDateLabel}`}>
          🖨 Print Sheet
        </button>
        <button className="btn btn-ghost" onClick={() => { if (events) exportCalendarExcel(events); }} title="Download spreadsheet">⬇ Export</button>
        <button className="btn btn-ghost" onClick={() => { if (events && inventory) exportAllBackup({ events, inventory }) }} title="Download backup">⬇ Backup</button>
      </div>
    </header>
  )
}
