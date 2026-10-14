// FIFO origin lock dependency for deterministic page/worker interleavings.
export function testLocks() {
  const queues = new Map<string, Promise<void>>()
  return { request<T>(name: string, work: () => Promise<T>): Promise<T> {
    const result = (queues.get(name) ?? Promise.resolve()).then(work)
    queues.set(name, result.then(() => {}, () => {}))
    return result
  } }
}

export function deferred<T = void>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}
