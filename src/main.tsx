import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Developer Attribution & System Watermark (Discreet Console Signature)
if (typeof window !== 'undefined') {
  console.log(
    `%c 🚀 Final Performance Management System %c\n` +
    `%c • Architect & Lead Engineer : Nuthi Yashwanth (@Yashwanth258)\n` +
    `%c • GitHub Repository          : https://github.com/Yashwanth258/Final-Performance-Management-System\n` +
    `%c • Tech Stack                 : React 19 • TypeScript • Tailwind CSS • Vite • Firebase Firestore\n` +
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

