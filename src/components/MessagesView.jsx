import { useState, useMemo } from 'react'

function timeAgo(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return d.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' })
}

export default function MessagesView({ messages = [], onReply, onBlock, onDelete, onRestore, onMarkRead, onHardDelete, showToast }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('ALL') // ALL | UNREAD | REPLIED | BLOCKED | DELETED
  const [replyDraft, setReplyDraft] = useState({})
  const [expanded, setExpanded] = useState(null)

  const filtered = useMemo(() => {
    return messages.filter(m => {
      if (filter === 'UNREAD' && (m.is_read || m.is_deleted || m.is_blocked)) return false
      if (filter === 'REPLIED' && (!m.is_replied || m.is_deleted)) return false
      if (filter === 'BLOCKED' && !m.is_blocked) return false
      if (filter === 'DELETED' && !m.is_deleted) return false
      if (filter === 'ALL' && m.is_deleted) return false
      // when filter is ALL, hide blocked? No, show all except deleted — blocked shown with badge
      if (search.trim()) {
        const q = search.toLowerCase()
        const hay = `${m.customerName || m.customer_name || ''} ${m.phone || m.customerPhone || ''} ${m.address || ''} ${m.message || ''} ${m.reply || ''} ${m.orderId || ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    }).sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt))
  }, [messages, filter, search])

  const counts = useMemo(() => {
    const total = messages.filter(m => !m.is_deleted).length
    const unread = messages.filter(m => !m.is_read && !m.is_deleted && !m.is_blocked).length
    const replied = messages.filter(m => m.is_replied && !m.is_deleted).length
    const blocked = messages.filter(m => m.is_blocked && !m.is_deleted).length
    const deleted = messages.filter(m => m.is_deleted).length
    return { total, unread, replied, blocked, deleted }
  }, [messages])

  const handleReply = async (id) => {
    const fallback = messages.find(m => String(m.id) === String(id))?.reply || ''
    const text = (replyDraft[id] ?? fallback ?? '').trim()
    if (!text) return showToast && showToast('Reply cannot be empty')
    if (onReply) await onReply(id, text)
    setReplyDraft(d => ({ ...d, [id]: '' }))
    setExpanded(null)
  }

  return (
    <div>
      <div className="section-head" style={{ borderTop: 'none' }}>
        <div>
          <h2>💬 Messages</h2>
          <p>Customer inbox — reply, block, delete • All messages come from Supabase <code>public.messages</code> • <span className="pill slate" style={{ fontSize: 11 }}>{counts.total} total • {counts.unread} unread</span></p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="pill" style={{ background: counts.unread ? '#fef3c7' : '#dcfce7', color: counts.unread ? '#92400e' : '#065f46', borderColor: counts.unread ? '#fde68a' : '#a7f3d0' }}>{counts.unread} unread</span>
          <span className="pill blue" style={{ fontSize: 11 }}>{counts.replied} replied</span>
          <span className="pill amber" style={{ fontSize: 11 }}>{counts.blocked} blocked</span>
          <span className="pill slate" style={{ fontSize: 11 }}>{counts.deleted} deleted</span>
        </div>
      </div>

      <div style={{ margin: '0 18px', background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 12, padding: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: '1 1 220px', minWidth: 180, position: 'relative' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer, phone, message, order..." style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 10, border: '1px solid var(--slate-200)', fontSize: 13, background: 'var(--white)', color: 'var(--slate-700)' }} />
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)', fontSize: 14 }}>⌕</span>
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '8px 10px', borderRadius: 9, border: '1px solid var(--slate-200)', fontSize: 12, fontWeight: 700, background: 'var(--white)', color: 'var(--slate-700)' }}>
          <option value="ALL">All (except deleted)</option>
          <option value="UNREAD">Unread ({counts.unread})</option>
          <option value="REPLIED">Replied ({counts.replied})</option>
          <option value="BLOCKED">Blocked ({counts.blocked})</option>
          <option value="DELETED">Deleted ({counts.deleted})</option>
        </select>
        <span style={{ fontSize: 12, color: 'var(--slate-500)', fontWeight: 600 }}>{filtered.length} of {messages.length} messages</span>
        {(search || filter !== 'ALL') && <button className="btn-xs" onClick={() => { setSearch(''); setFilter('ALL') }}>Clear</button>}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--slate-400)', fontWeight: 600, display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: '#0ea5e9', display: 'inline-block' }}></span> DB-driven
        </span>
      </div>

      <div style={{ display: 'flex', gap: 6, padding: '10px 18px', flexWrap: 'wrap' }}>
        {[
          { id: 'ALL', label: 'All', count: counts.total },
          { id: 'UNREAD', label: 'Unread', count: counts.unread },
          { id: 'REPLIED', label: 'Replied', count: counts.replied },
          { id: 'BLOCKED', label: 'Blocked', count: counts.blocked },
          { id: 'DELETED', label: 'Deleted', count: counts.deleted },
        ].map(f => {
          const active = filter === f.id
          return (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              padding: '6px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700,
              border: `1px solid ${active ? 'var(--slate-900)' : 'var(--slate-200)'}`,
              background: active ? 'var(--slate-900)' : 'var(--white)', color: active ? 'var(--white)' : 'var(--slate-700)', cursor: 'pointer'
            }}>
              {f.label} <span style={{ opacity: 0.7, fontWeight: 600 }}>({f.count})</span>
            </button>
          )
        })}
      </div>

      <div style={{ display: 'grid', gap: 10, padding: '0 18px 18px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, background: 'var(--white)', border: '1px dashed var(--slate-300)', borderRadius: 12, color: 'var(--slate-500)' }}>
            No messages in this filter. Customers’ messages will appear here once they message your station (stored in Supabase).
          </div>
        ) : filtered.map(m => {
          const isExpanded = expanded === m.id
          const customer = m.customerName || m.customer_name
          const phone = m.phone || m.customerPhone
          const addr = m.address || m.customer_address
          return (
            <div key={m.id} style={{
              background: m.is_blocked ? '#fef2f2' : m.is_deleted ? '#f8fafc' : 'var(--white)',
              border: `1px solid ${m.is_blocked ? '#fecaca' : m.is_deleted ? '#e2e8f0' : m.is_read ? 'var(--slate-200)' : '#fde68a'}`,
              borderRadius: 12, padding: 14, opacity: m.is_deleted ? 0.75 : 1, boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ width: 36, height: 36, borderRadius: 999, background: m.is_blocked ? '#fee2e2' : m.is_read ? 'var(--slate-100)' : '#fef3c7', display: 'grid', placeItems: 'center', fontSize: 16, flexShrink: 0, border: '1px solid var(--slate-200)' }}>
                  {m.is_blocked ? '🚫' : m.is_replied ? '✅' : m.is_read ? '👁️' : '💬'}
                </div>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <b style={{ color: 'var(--slate-900)', fontSize: 13 }}>{customer}</b>
                    <span style={{ fontSize: 11, color: 'var(--slate-500)' }}>{phone || '—'} {addr ? `• ${addr}` : ''}</span>
                    {m.orderId || m.order_id ? <span className="pill slate" style={{ fontSize: 10 }}>{m.orderId || m.order_id}</span> : null}
                    {!m.is_read && !m.is_deleted && !m.is_blocked && <span className="pill amber" style={{ fontSize: 10 }}>Unread</span>}
                    {m.is_replied && <span className="pill green" style={{ fontSize: 10 }}>Replied</span>}
                    {m.is_blocked && <span className="pill red" style={{ fontSize: 10 }}>Blocked</span>}
                    {m.is_deleted && <span className="pill slate" style={{ fontSize: 10 }}>Deleted</span>}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--slate-800)', marginTop: 6, lineHeight: 1.5, background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 8, padding: '8px 10px' }}>
                    {m.message}
                  </div>
                  {m.reply && (
                    <div style={{ marginTop: 8, background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: '#065f46' }}>
                      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: '#059669', marginBottom: 4 }}>Your reply {m.repliedAt || m.replied_at ? `• ${timeAgo(m.repliedAt || m.replied_at)}` : ''}</div>
                      {m.reply}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--slate-500)', marginTop: 6, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <span>Received {timeAgo(m.created_at || m.createdAt)}</span>
                    {m.updatedAt || m.updated_at ? <span>• Updated {timeAgo(m.updatedAt || m.updated_at)}</span> : null}
                    {m.is_blocked && m.blockedAt ? <span>• Blocked {timeAgo(m.blockedAt)}</span> : null}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 120 }}>
                  <button className="btn-xs" style={{ padding: '6px 10px', background: isExpanded ? 'var(--slate-900)' : 'var(--white)', color: isExpanded ? 'var(--white)' : 'var(--slate-700)', borderColor: 'var(--slate-200)' }} onClick={() => {
                    const willExpand = !isExpanded
                    setExpanded(willExpand ? m.id : null)
                    if (willExpand && replyDraft[m.id] === undefined) {
                      setReplyDraft(d => ({ ...d, [m.id]: m.reply || '' }))
                    }
                    if (!m.is_read && !m.is_deleted && onMarkRead) onMarkRead(m.id, true)
                  }}>
                    {isExpanded ? 'Close' : m.is_replied ? 'Reply again' : 'Reply'}
                  </button>
                  {!m.is_deleted && (
                    <button className="btn-xs" style={{ padding: '6px 10px', background: m.is_blocked ? '#dcfce7' : '#fee2e2', color: m.is_blocked ? '#065f46' : '#991b1b', borderColor: m.is_blocked ? '#a7f3d0' : '#fecaca' }} onClick={() => onBlock && onBlock(m.id, !m.is_blocked)}>
                      {m.is_blocked ? 'Unblock' : 'Block'}
                    </button>
                  )}
                  {!m.is_deleted ? (
                    <button className="btn-xs danger" style={{ padding: '6px 10px' }} onClick={() => onDelete && onDelete(m.id, false)}>Delete</button>
                  ) : (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-xs" style={{ flex: 1 }} onClick={() => onRestore && onRestore(m.id)}>Restore</button>
                      <button className="btn-xs danger" style={{ flex: 1 }} onClick={() => onHardDelete && onHardDelete(m.id)}>Delete forever</button>
                    </div>
                  )}
                  {!m.is_read && !m.is_deleted && !m.is_blocked && (
                    <button className="btn-xs" onClick={() => onMarkRead && onMarkRead(m.id, true)}>Mark read</button>
                  )}
                </div>
              </div>

              {isExpanded && !m.is_deleted && (
                <div style={{ marginTop: 12, background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 10, padding: 12, display: 'grid', gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate-700)' }}>Reply to {customer} {phone ? `(${phone})` : ''}</div>
                  <textarea
                    value={replyDraft[m.id] ?? m.reply ?? ''}
                    onChange={e => setReplyDraft(d => ({ ...d, [m.id]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(m.id) } }}
                    placeholder="Type your reply — Enter to send, Shift+Enter for new line..."
                    rows={3}
                    style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--slate-200)', fontSize: 13, resize: 'vertical' }}
                  />
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <button className="btn-cancel" onClick={() => setExpanded(null)}>Cancel</button>
                    <button className="btn-save" onClick={() => handleReply(m.id)}>Send reply</button>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--slate-500)' }}>Reply is stored in <code>messages.reply</code> + <code>is_replied=true</code> in Supabase (this web app).</div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ margin: '0 18px 18px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '12px 14px', fontSize: 12.5, color: '#065f46', lineHeight: 1.5, display: 'flex', gap: 10 }}>
        <span>💡</span>
        <span><b>Audit:</b> All messages come from <code>public.messages</code> (Supabase). Block sets <code>is_blocked=true</code> + <code>blocked_at</code>; Delete sets <code>is_deleted=true</code> (soft) or hard delete; Reply sets <code>reply</code> + <code>is_replied</code> + <code>is_read</code>. No dummy data — only DB rows.</span>
      </div>
    </div>
  )
}
