import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// StrictMode is intentionally omitted: its dev-only double-invoke would mount the
// Phaser canvas twice. GameCanvas guards against that anyway, but skipping
// StrictMode is the lower-risk default for a Phaser host (see the build plan).
createRoot(document.getElementById('root')!).render(<App />)
