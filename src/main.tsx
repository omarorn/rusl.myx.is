import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { DesktopWrapper } from './components/DesktopWrapper'
import { SettingsProvider } from './context/SettingsContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SettingsProvider>
      <DesktopWrapper>
        <App />
      </DesktopWrapper>
    </SettingsProvider>
  </React.StrictMode>,
)
