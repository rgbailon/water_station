import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, parseISO } from 'date-fns';

export function getMonthMatrix(date) {
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(date), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start, end });
  // chunk into weeks
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

export function formatMonthYear(date) {
  return format(date, 'MMMM yyyy');
}
export function formatISO(date) {
  // local date ISO — accurate for device timezone (Irosin = Asia/Manila)
  return format(date, 'yyyy-MM-dd');
}
export function formatISO_PH(date) {
  // Explicit PH timezone ISO for printing — avoids UTC off-by-one
  const d = date instanceof Date ? date : parseISO(date)
  // Use local formatISO since device is expected to be Asia/Manila; fallback to Intl if needed
  return format(d, 'yyyy-MM-dd')
}
export function manilaISODate(ts) {
  // Epoch millis (or Date / date string) → YYYY-MM-DD calendar day in Asia/Manila.
  // Built from formatToParts so the result never depends on the device locale.
  // Returns '' when the input has no usable date — callers must handle that.
  try {
    const d = ts instanceof Date ? ts : new Date(ts)
    if (Number.isNaN(d.getTime())) return ''
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' })
        .formatToParts(d).map(p => [p.type, p.value])
    )
    if (!parts.year || !parts.month || !parts.day) return ''
    return `${parts.year}-${parts.month}-${parts.day}`
  } catch { return '' }
}
export function formatPHLong(date) {
  // Accurate long date in Asia/Manila
  const d = date instanceof Date ? date : parseISO(date)
  return d.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}
export function formatPHShort(date) {
  const d = date instanceof Date ? date : parseISO(date)
  return d.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric' })
}
export function nowPHString() {
  return new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
}
export function parseDate(str) {
  return parseISO(str);
}
export { addMonths, subMonths, isSameMonth, isSameDay, format };

export function getEventsForDate(events, isoDate) {
  return events.filter(e => e.date === isoDate);
}

export function getBadgeColor(type) {
  const map = { sale: 'sale', delivery: 'delivery', expense: 'expense', hiram: 'hiram', maintenance: 'maintenance' };
  return map[type] || 'sale';
}

export function peso(n) {
  return `₱${Number(n).toLocaleString('en-PH')}`;
}
