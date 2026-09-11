import { getMonthMatrix, formatMonthYear, formatISO, isSameMonth, isSameDay, getEventsForDate, peso } from '../utils/dateUtils'
import { format } from 'date-fns'

export default function CalendarGrid({ currentDate, events, selectedDate, onSelectDate, onAddClick, onEventClick, filters }) {
  const weeks = getMonthMatrix(currentDate)
  const today = new Date()

  const visibleEvents = (dateStr) => {
    const evs = getEventsForDate(events, dateStr)
    return evs.filter(e => filters[e.type])
  }

  return (
    <div>
      <div className="calendar-grid">
        <div className="weekday-row">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="weekday">{d}</div>)}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="month-row" style={{ marginBottom: 8 }}>
            {week.map(day => {
              const iso = formatISO(day)
              const evs = visibleEvents(iso)
              const isOutside = !isSameMonth(day, currentDate)
              const isToday = isSameDay(day, today)
              const isSelected = selectedDate && formatISO(selectedDate) === iso
              const total = evs.filter(e => e.type === 'sale' || e.type === 'delivery').reduce((s, e) => s + (e.amount || 0), 0)
              return (
                <div
                  key={iso}
                  className={`cal-cell ${isOutside ? 'outside' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                  onClick={() => onSelectDate(day)}
                >
                  <span className="cell-watermark" aria-hidden>{format(day, 'd')}</span>
                  <span className="cell-plus" onClick={(e) => { e.stopPropagation(); onAddClick(day)}}>+</span>
                  <div className="cell-events">
                    {evs.slice(0, 3).map(ev => (
                      <div
                        key={ev.id}
                        className={`event-badge ${ev.type}`}
                        onClick={(e) => { e.stopPropagation(); onEventClick(ev)}}
                        title={`${ev.title} - ${ev.customer}`}
                      >
                        <span className="e-dot"></span>
                        <span className="txt" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.type === 'sale' ? peso(ev.amount) : ev.title.length > 14 ? ev.title.slice(0,14)+'…' : ev.title}</span>
                      </div>
                    ))}
                    {evs.length > 3 && <div className="more-count">+{evs.length - 3} more</div>}
                  </div>
                  {evs.length > 0 && (
                    <div className="cell-summary">
                      <span>{evs.length} items</span>
                      {total > 0 && <b>{peso(total)}</b>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
