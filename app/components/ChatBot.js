'use client';
import { useState, useRef, useEffect } from 'react';

export default function ChatBot({ companyId }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Hello! I\'m your F&B financial advisor. Ask me anything about your restaurant or café finances, food cost management, cash flow optimization, or growth strategies.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const history = messages.filter(m => m.role !== 'ai' || messages.indexOf(m) > 0)
        .map(m => ({ role: m.role === 'ai' ? 'model' : 'user', text: m.text }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, company_id: companyId, history }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.reply || 'Sorry, I could not process that.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'Connection error. Please try again.' }]);
    }
    setLoading(false);
  };

  return (
    <>
      <button className="chatbot-toggle" onClick={() => setOpen(!open)} title="AI Financial Advisor">
        {open ? '✕' : '🤖'}
      </button>

      {open && (
        <div className="chatbot-panel">
          <div className="chatbot-header">
            <h3>🤖 Kopi Assist AI</h3>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
          </div>

          <div className="chatbot-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg ${msg.role === 'ai' ? 'ai' : 'user'}`}>
                {msg.text}
              </div>
            ))}
            {loading && (
              <div className="chat-msg ai" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <div className="spinner" /> Thinking...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-input">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Ask about your finances..."
            />
            <button onClick={sendMessage} disabled={loading}>➤</button>
          </div>
        </div>
      )}
    </>
  );
}
