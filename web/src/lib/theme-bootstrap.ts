// Bundled into public/theme.js: blocking, same-origin, no module/network read.
import { THEME_KEY, applyTheme, readTheme } from './theme-record'
let raw: string | null = null
try { raw = localStorage.getItem(THEME_KEY) } catch { /* storage denial */ }
const record = readTheme(raw)
applyTheme(record, window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false)
try { localStorage.setItem(THEME_KEY, JSON.stringify(record)) } catch { /* current document still themed */ }
