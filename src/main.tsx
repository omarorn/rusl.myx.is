import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { DesktopWrapper } from './components/DesktopWrapper'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DesktopWrapper>
      <App />
    </DesktopWrapper>
  </React.StrictMode>,
)
