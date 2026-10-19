import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Clear old app localStorage keys on app start, keeping only keys starting with "sb-"
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !key.startsWith('sb-')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore
      }
    });
  } catch (err) {
    console.error('Failed to clear old localStorage keys:', err);
  }
}

// Developer Attribution & System Watermark (Discreet Console Signature)
if (typeof window !== 'undefined') {
  console.log(
    `%c 🚀 DailySync %c\n` +
    `%c • Architect & Lead Engineer : Nuthi Yashwanth (@Yashwanth258)\n` +
    `%c • GitHub Repository          : https://github.com/Yashwanth258/Final-Performance-Management-System\n` +
    `%c • Tech Stack                 : React 19 • TypeScript • Tailwind CSS • Vite • Supabase PostgreSQL\n` +
    `%c • Build Version              : v1.0.0-production | All Rights Reserved © 2026 Nuthi Yashwanth`,
    'background: #0284c7; color: #ffffff; font-size: 13px; font-weight: 800; padding: 6px 14px; border-radius: 6px 6px 0 0; margin-top: 8px;',
    '',
    'color: #0369a1; font-weight: 700; font-size: 11px; padding-top: 5px;',
    'color: #475569; font-size: 11px;',
    'color: #64748b; font-size: 10px;',
    'color: #059669; font-size: 10px; font-weight: 600; padding-bottom: 8px;'
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

