import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Dev 모드에서만 Firestore 요청 추적 도구 자동 로드 (production 빌드에서는 import 자체 제거).
if (import.meta.env.DEV) {
  import('./lib/firebaseDebug.js');
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
