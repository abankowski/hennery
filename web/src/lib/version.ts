/** Absent on collectors built before the version display was introduced. */
export interface CollectorVersion {
  collector_version?: string
  source_commit?: string | null
}

export function versionText(page: string, collector: CollectorVersion | null): { label: string; hint: string | null } {
  const server = collector?.collector_version
  if (!server) return { label: `page ${page}`, hint: 'server version unavailable' }
  const commit = collector?.source_commit?.slice(0, 8)
  return {
    label: `hennery ${server}${commit ? ` · ${commit}` : ''}`,
    hint: page !== server ? `page ${page} · server ${server}` : null,
  }
}
