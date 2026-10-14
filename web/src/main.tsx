// First: takes the setup token out of the address bar before any other
// module, or React's double-run effects, can see it.
import './setup-token'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { registerWorker } from './pwa/lifecycle'

void registerWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
