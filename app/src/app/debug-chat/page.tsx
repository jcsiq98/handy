'use client';

import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '(no env set — using proxy)';
const BUILD_TS = new Date().toISOString(); // Baked at build time

export default function DebugChatPage() {
  const [results, setResults] = useState<string[]>([]);
  const [polling, setPolling] = useState(false);
  const [pollCount, setPollCount] = useState(0);

  const log = (msg: string) => setResults((p) => [...p, `${new Date().toLocaleTimeString()} — ${msg}`]);

  // Test 1: API health
  useEffect(() => {
    log(`🔧 Build timestamp: ${BUILD_TS}`);
    log(`🔧 NEXT_PUBLIC_API_URL = ${API_URL}`);
    log(`🔧 User Agent: ${navigator.userAgent.slice(0, 60)}...`);

    // Test proxy API
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => log(`✅ Proxy API: ${d.status} (${d.service})`))
      .catch((e) => log(`❌ Proxy API error: ${e.message}`));

    // Test direct API
    fetch('https://handy-production-8390.up.railway.app/api/health')
      .then((r) => r.json())
      .then((d) => log(`✅ Direct API: ${d.status} (${d.service})`))
      .catch((e) => log(`❌ Direct API error: ${e.message}`));

    // Test auth token
    const token = localStorage.getItem('handy_access_token');
    if (token) {
      log(`🔑 Auth token exists (${token.length} chars)`);

      // Test authenticated API call (get unread messages)
      fetch('/api/messages/unread', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => {
          log(`📬 Unread endpoint: HTTP ${r.status}`);
          return r.json();
        })
        .then((d) => log(`📬 Unread data: ${JSON.stringify(d)}`))
        .catch((e) => log(`❌ Unread error: ${e.message}`));
    } else {
      log('⚠️ No auth token found — not logged in');
    }

    // Test WebSocket
    import('socket.io-client').then(({ io }) => {
      const wsUrl = API_URL.includes('http') ? API_URL : 'https://handy-production-8390.up.railway.app';
      log(`🔌 Trying WebSocket to ${wsUrl}/chat ...`);
      const socket = io(`${wsUrl}/chat`, {
        auth: { token },
        transports: ['websocket', 'polling'],
        timeout: 5000,
      });

      socket.on('connect', () => {
        log(`✅ WebSocket connected! (id: ${socket.id})`);
        socket.disconnect();
      });

      socket.on('connect_error', (err) => {
        log(`❌ WebSocket error: ${err.message}`);
        socket.disconnect();
      });

      setTimeout(() => {
        if (!socket.connected) {
          log('⏰ WebSocket timeout (5s)');
          socket.disconnect();
        }
      }, 5000);
    });
  }, []);

  // Test 2: Polling simulation
  useEffect(() => {
    if (!polling) return;

    const token = localStorage.getItem('handy_access_token');
    if (!token) {
      log('⚠️ Cannot poll without auth token');
      return;
    }

    const poll = async () => {
      try {
        const res = await fetch('/api/messages/unread', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPollCount((c) => c + 1);
        if (res.ok) {
          const data = await res.json();
          log(`🔄 Poll OK — unread: ${data.count}`);
        } else {
          log(`🔄 Poll HTTP ${res.status}`);
        }
      } catch (e: any) {
        log(`❌ Poll error: ${e.message}`);
      }
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [polling]);

  return (
    <div className="min-h-screen bg-gray-900 text-green-400 p-4 font-mono text-xs">
      <h1 className="text-lg text-white mb-2">🔍 Handy Chat Debug</h1>
      <p className="text-gray-500 mb-4">Esta página diagnostica la conexión del chat</p>

      <button
        onClick={() => setPolling(!polling)}
        className={`px-4 py-2 rounded text-sm font-bold mb-4 ${
          polling ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
        }`}
      >
        {polling ? `⏹ Detener Polling (${pollCount})` : '▶️ Iniciar Polling Test'}
      </button>

      <div className="space-y-1 max-h-[70vh] overflow-y-auto">
        {results.map((r, i) => (
          <div key={i} className={`${r.includes('❌') ? 'text-red-400' : r.includes('✅') ? 'text-green-400' : 'text-yellow-300'}`}>
            {r}
          </div>
        ))}
        {results.length === 0 && <div className="text-gray-500">Ejecutando pruebas...</div>}
      </div>
    </div>
  );
}

