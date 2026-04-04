import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePilotPortal } from '../PilotContext'
import { supabase } from '../../lib/supabase'

const QUICK_REPLIES = [
  "What's your current fuel price?",
  "We'll need the crew car ASAP",
  "ETA may be delayed — will update",
  "Quick turn — departing within 1 hour",
  "Is the hangar available tonight?",
]

function ConversationList() {
  const { activeRequests, requests } = usePilotPortal()
  const navigate = useNavigate()
  const [fboNames, setFboNames] = useState({})

  const convRequests = requests.filter(r => ['pending', 'confirmed', 'completed'].includes(r.status)).slice(0, 20)

  useEffect(() => {
    const fboIds = [...new Set(convRequests.map(r => r.fbo_id).filter(Boolean))]
    if (fboIds.length === 0) return
    supabase.from('fbo_profiles').select('id, fbo_name, airport_icao').in('id', fboIds).then(({ data }) => {
      if (data) {
        const map = {}
        data.forEach(f => { map[f.id] = f })
        setFboNames(map)
      }
    })
  }, [convRequests.length])

  return (
    <div>
      <h1 className="text-[32px] mb-6" style={{ color: '#E8EDF7', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>
        Messages
      </h1>
      {convRequests.length === 0 ? (
        <div className="rounded-xl p-10 text-center" style={{ background: '#0E1525' }}>
          <p className="text-[14px]" style={{ color: '#4A566E' }}>No conversations yet. Send a service request to start messaging with an FBO.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {convRequests.map(req => {
            const fbo = fboNames[req.fbo_id]
            return (
              <button key={req.id} onClick={() => navigate(`/pilot/messages/${req.id}`)}
                className="w-full rounded-xl px-5 py-4 border-none cursor-pointer text-left flex items-center justify-between transition-all"
                style={{ background: '#0E1525', border: '0.5px solid rgba(255,255,255,0.06)' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}>
                <div>
                  <p className="text-[14px] font-medium" style={{ color: '#E8EDF7' }}>{fbo?.fbo_name || 'FBO'}</p>
                  <p className="text-[12px] mt-0.5" style={{ color: '#4A566E' }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", color: '#4EADFF' }}>{fbo?.airport_icao || req.airport_icao}</span> · {req.status}
                  </p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A566E" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ConversationView() {
  const { requestId } = useParams()
  const navigate = useNavigate()
  const { fetchMessages, sendMessage, requests } = usePilotPortal()
  const [msgs, setMsgs] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fboName, setFboName] = useState('')
  const [fboTyping, setFboTyping] = useState(false)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const typingTimeout = useRef(null)
  const lastBroadcast = useRef(0)

  const req = requests.find(r => r.id === requestId)

  useEffect(() => {
    if (req?.fbo_id) {
      supabase.from('fbo_profiles').select('fbo_name, airport_icao').eq('id', req.fbo_id).single().then(({ data }) => {
        if (data) setFboName(`${data.fbo_name} · ${data.airport_icao}`)
      })
    }
  }, [req?.fbo_id])

  useEffect(() => {
    setLoading(true)
    fetchMessages(requestId).then(data => { setMsgs(data); setLoading(false) })
  }, [requestId, fetchMessages])

  useEffect(() => {
    const ch = supabase.channel(`chat-${requestId}`).on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'messages', filter: `request_id=eq.${requestId}`,
    }, (payload) => {
      setMsgs(p => { if (p.some(m => m.id === payload.new.id)) return p; return [...p, payload.new] })
    }).subscribe()
    return () => supabase.removeChannel(ch)
  }, [requestId])

  // Typing indicator via Supabase broadcast
  useEffect(() => {
    const ch = supabase.channel(`typing-${requestId}`).on('broadcast', { event: 'typing' }, ({ payload }) => {
      if (payload?.role === 'csr') {
        if (payload.stopped) { setFboTyping(false); clearTimeout(typingTimeout.current); return }
        setFboTyping(true)
        clearTimeout(typingTimeout.current)
        typingTimeout.current = setTimeout(() => setFboTyping(false), 3000)
      }
    }).subscribe()
    return () => { supabase.removeChannel(ch); clearTimeout(typingTimeout.current) }
  }, [requestId])

  const broadcastTyping = () => {
    const now = Date.now()
    if (now - lastBroadcast.current < 500) return
    lastBroadcast.current = now
    supabase.channel(`typing-${requestId}`).send({ type: 'broadcast', event: 'typing', payload: { role: 'pilot' } })
  }

  const broadcastStopTyping = () => {
    supabase.channel(`typing-${requestId}`).send({ type: 'broadcast', event: 'typing', payload: { role: 'pilot', stopped: true } })
  }

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [msgs, fboTyping])

  const handleSend = async (body) => {
    const b = body || text.trim()
    if (!b || sending) return
    setSending(true)
    broadcastStopTyping()
    const msg = await sendMessage({ requestId, body: b.slice(0, 500) })
    if (msg) setMsgs(p => { if (p.some(m => m.id === msg.id)) return p; return [...p, msg] })
    setText('')
    setSending(false)
    inputRef.current?.focus()
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 160px)', minHeight: '500px' }}>
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 mb-4" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => navigate('/pilot/messages')} className="bg-transparent border-none cursor-pointer" style={{ color: '#4A566E' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <p className="text-[14px] font-medium" style={{ color: '#E8EDF7' }}>{fboName}</p>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-2">
        {loading ? (
          <p className="text-[13px] text-center py-8" style={{ color: '#4A566E' }}>Loading...</p>
        ) : msgs.length === 0 ? (
          <p className="text-[13px] text-center py-8" style={{ color: '#4A566E' }}>No messages yet — start the conversation.</p>
        ) : (
          msgs.map(m => (
            <div key={m.id} className={`flex flex-col ${m.sender_role === 'pilot' ? 'items-end' : 'items-start'}`}>
              <div className="max-w-[75%] px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed"
                style={{
                  background: m.sender_role === 'pilot' ? '#4EADFF' : '#0E1525',
                  color: m.sender_role === 'pilot' ? '#080D18' : '#E8EDF7',
                  borderBottomRightRadius: m.sender_role === 'pilot' ? '4px' : undefined,
                  borderBottomLeftRadius: m.sender_role !== 'pilot' ? '4px' : undefined,
                }}>
                {m.body}
              </div>
              <span className="text-[10px] mt-1 px-1" style={{ color: '#4A566E' }}>
                {new Date(m.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}
        {fboTyping && (
          <div className="flex flex-col items-start">
            <div className="px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1.5 items-center" style={{ background: '#0E1525' }}>
              <span className="typing-dot" style={{ color: '#4A566E' }} />
              <span className="typing-dot" style={{ color: '#4A566E' }} />
              <span className="typing-dot" style={{ color: '#4A566E' }} />
            </div>
          </div>
        )}
      </div>

      {/* Quick replies */}
      <div className="pt-3 pb-2 flex gap-2 overflow-x-auto scrollbar-none">
        {QUICK_REPLIES.map(qr => (
          <button key={qr} onClick={() => handleSend(qr)}
            className="text-[11px] px-3 py-1.5 rounded-full border-none cursor-pointer whitespace-nowrap shrink-0 transition-all"
            style={{ background: '#0E1525', color: '#4A566E' }}>
            {qr}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-3 pt-2">
        <input ref={inputRef} type="text" value={text} onChange={e => { setText(e.target.value.slice(0, 500)); broadcastTyping() }}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Message..." className="flex-1 h-12 rounded-xl px-5 text-[14px] border-none outline-none"
          style={{ background: '#0E1525', color: '#E8EDF7', caretColor: '#4EADFF' }} />
        <button onClick={() => handleSend()} disabled={!text.trim() || sending}
          className="h-12 w-12 rounded-xl border-none cursor-pointer flex items-center justify-center disabled:opacity-30 transition-all"
          style={{ background: '#4EADFF' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#080D18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default function Messages() {
  const { requestId } = useParams()
  const { setUnreadMessages } = usePilotPortal()

  // Clear unread badge when entering Messages
  useEffect(() => {
    setUnreadMessages(0)
  }, [setUnreadMessages])

  return requestId ? <ConversationView /> : <ConversationList />
}
