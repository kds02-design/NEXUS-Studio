import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import TTIndex from './TTIndex.jsx'

createRoot(document.getElementById('tt-root')).render(
  <StrictMode>
    <TTIndex />
  </StrictMode>,
)
