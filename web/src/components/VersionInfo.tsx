import { createContext, useContext } from 'react'
import { versionText, type CollectorVersion } from '../lib/version'
import '../styles/version.css'

export const CollectorVersionContext = createContext<CollectorVersion | null>(null)

export default function VersionInfo() {
  const text = versionText(__PAGE_VERSION__, useContext(CollectorVersionContext))
  return <div className="version-info"><span>{text.label}</span>{text.hint && <span className="version-hint">{text.hint}</span>}</div>
}
