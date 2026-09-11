import ThemeToggle from './ThemeToggle'
import { exportCalendarExcel, exportAllBackup } from '../utils/export'

export default function Header({ onExport, onPrint, theme, onToggleTheme, printDateLabel, events, inventory }) {
  return (
    <header className="app-header">
      <div className="header-left">
        <div className="logo-mark">💧</div>
        <div className="header-title">
          <h1>Tubig Irosin Inventory</h1>
          <p><span className="dot"></span> Water Refilling Station • Irosin, Sorsogon • Offline Ready</p>
        </div>
      </div>
      <div className="header-actions">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        <span className="badge-offline">● Offline Mode • Data saved locally</span>
        <button className="btn btn-ghost" onClick={onPrint} title={`Print daily sheet for ${printDateLabel}`}>
          🖨 Print Sheet
        </button>
        <button className="btn btn-ghost" onClick={() => { if (events) exportCalendarExcel(events); }} title="Download spreadsheet (Excel .xls) — professional formatted">⬇ Export</button>
        <button className="btn btn-ghost" onClick={() => { if (events && inventory) exportAllBackup({ events, inventory }) }} title="Download JSON backup (full DB)">⬇ Backup</button>
        <button className="btn btn-primary" onClick={onExport}><span className="plus">+</span> New Entry</button>
      </div>
    </header>
  )
}
