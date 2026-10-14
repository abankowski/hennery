// Same-origin deploy fixture. Static bytes come from two *embedded* builds;
// API/auth stays at the first collector. The forwarder is never a push egress.
import { createServer } from 'node:http'
import { type AddressInfo } from 'node:net'
import type { Collector } from './collector'
export async function deployProxy(a: Collector, b: Collector) {
  let variant: 'a' | 'b' | 'mixed' = 'a'
  const reads: { path: string; build: string }[] = []
  const server = createServer(async (request, response) => {
    try {
      const path = new URL(request.url!, 'http://localhost').pathname
      const staticFile = path === '/sw.js' || path === '/index.html' || path === '/theme.js' || path.startsWith('/assets/') || path.endsWith('.png') || path.endsWith('.webmanifest') || path.endsWith('.svg')
      const target = staticFile && (variant === 'b' || variant === 'mixed' && path === '/sw.js') ? b : a
      if (staticFile) reads.push({ path, build: target === b ? 'b' : 'a' })
      const chunks: Buffer[] = []
      for await (const chunk of request) chunks.push(Buffer.from(chunk))
      const body = Buffer.concat(chunks)
      const headers = new Headers()
      for (const [key, value] of Object.entries(request.headers)) if (key !== 'host' && value) headers.set(key, Array.isArray(value) ? value.join(', ') : value)
      const upstream = await fetch(target.origin + request.url, { method: request.method, headers, ...(body.length ? { body } : {}), redirect: 'manual' })
      response.writeHead(upstream.status, Object.fromEntries([...upstream.headers].filter(([key]) => key !== 'transfer-encoding' && key !== 'content-encoding' && key !== 'content-length')))
      // Streaming remains live; no buffering SSE.
      if (upstream.body) for await (const chunk of upstream.body) { if (!response.write(chunk)) await new Promise<void>((resolve) => response.once('drain', resolve)) }
      response.end()
    } catch { if (!response.headersSent) response.writeHead(502); response.end() }
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  return { origin: `http://localhost:${(server.address() as AddressInfo).port}`, reads,
    use(next: typeof variant) { variant = next },
    async stop() { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())) },
  }
}
