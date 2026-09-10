import ThemeToggle from './ThemeToggle'

export default function Header({ onExport, onPrint, theme, onToggleTheme, printDateLabel }) {
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
        <button className="btn btn-ghost" onClick={() => alert('Backup exported! (JSON will be downloadable when DB is connected)')}>⬇ Export</button>
        <button className="btn btn-primary" onClick={onExport}>+ New Entry</button>
      </div>
    </header>
  )
}
