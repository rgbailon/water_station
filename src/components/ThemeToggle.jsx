export default function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === 'dark'
  return (
    <button
      className="theme-toggle"
      onClick={onToggle}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      type="button"
    >
      <span className="track" aria-hidden="true">
        <span className="icon-sun">☀️</span>
        <span className="icon-moon">🌙</span>
        <span className="thumb">{isDark ? '🌙' : '☀️'}</span>
      </span>
      <span className="label">{isDark ? 'Dark' : 'Light'}</span>
    </button>
  )
}
