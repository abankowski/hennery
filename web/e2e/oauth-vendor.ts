import { createServer } from 'node:http'

export interface VendorConfig { coop: boolean; deny: boolean; resourcePath: string; issuerPath: string; registration: boolean; s256: boolean; mcpStatus: number | null }
export interface Vendor {
  origin: string; mcpUrl: string; config: VendorConfig; counts: { registrations: number; exchanges: number; refreshes: number; handshakes: number }
  expire(): void; revoke(): void; stop(): Promise<void>
}
/** Loopback only; no files, processes or logging. */
export async function startVendor(): Promise<Vendor> {
  const server = createServer((_request, response) => { response.writeHead(404); response.end() })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('no loopback listener')
  const origin = `http://127.0.0.1:${address.port}`
  return { origin, mcpUrl: `${origin}/mcp`, config: { coop: false, deny: false, resourcePath: '/mcp', issuerPath: '', registration: true, s256: true, mcpStatus: null }, counts: { registrations: 0, exchanges: 0, refreshes: 0, handshakes: 0 }, expire() {}, revoke() {}, stop: () => new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve())) }
}
