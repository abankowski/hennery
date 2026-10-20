import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'

/** Stable R2 integration contract. Providers own mutations and capability checks;
 * the command host only discovers and dispatches enabled actions. */
export type AppActionId = 'new-session' | 'search-sessions' | 'toggle-rail' | 'toggle-details' | 'focus-composer' | 'open-needs-you' | 'open-sessions' | 'open-hosts' | 'open-mcp' | 'open-hats' | 'open-defaults' | 'open-settings' | 'open-commands'
export interface AppAction { label: string; enabled: boolean; run: () => void }
export interface AppContext { sessionId?: string; hostId?: string; cwd?: string; hatId?: string }
export class AppActions {
  private entries = new Map<AppActionId, { token: symbol; action: AppAction; priority: number }[]>()
  private contexts: { token: symbol; context: AppContext; priority: number }[] = []
  private listeners = new Set<() => void>()
  private revision = 0
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn) } }
  snapshot = () => this.revision
  private changed() { this.revision++; this.listeners.forEach(fn => fn()) }
  register(id: AppActionId, action: AppAction, priority = 0) {
    const token = Symbol(id)
    this.entries.set(id, [...(this.entries.get(id) ?? []), { token, action, priority }]); this.changed()
    return () => {
      const entries = (this.entries.get(id) ?? []).filter(entry => entry.token !== token)
      if (entries.length) this.entries.set(id, entries); else this.entries.delete(id)
      this.changed()
    }
  }
  get(id: AppActionId) { return this.entries.get(id)?.reduce((chosen, entry) => entry.priority >= chosen.priority ? entry : chosen).action }
  available() { return [...this.entries.keys()].flatMap(id => { const action = this.get(id); return action?.enabled ? [{ id, ...action }] : [] }) }
  dispatch(id: AppActionId): boolean { const action = this.get(id); if (!action?.enabled) return false; action.run(); return true }
  registerContext(context: AppContext, priority = 0) {
    const token = Symbol('context'); this.contexts.push({ token, context, priority }); this.changed()
    return () => { this.contexts = this.contexts.filter(entry => entry.token !== token); this.changed() }
  }
  context(): AppContext { return Object.assign({}, ...[...this.contexts].sort((a, b) => a.priority - b.priority).map(entry => entry.context)) }
}
const Context = createContext<AppActions | null>(null)
export function AppActionsProvider({ children }: { children: ReactNode }) {
  const [actions] = useState(() => new AppActions())
  return <Context.Provider value={actions}>{children}</Context.Provider>
}
/** Nullable outside App so existing standalone screen tests remain usable. */
export function useAppActions() { return useContext(Context) }
export function useActionSnapshot() {
  const actions = useAppActions()
  useSyncExternalStore(actions?.subscribe ?? noSubscribe, actions?.snapshot ?? zero)
  return actions
}
const noSubscribe = () => () => {}
const zero = () => 0
export function useRegisterAction(id: AppActionId, action: AppAction, priority = 0) {
  const actions = useAppActions()
  useEffect(() => actions?.register(id, action, priority), [actions, id, action.enabled, action.label, action.run, priority])
}
export function useRegisterContext(context: AppContext, priority = 0) {
  const actions = useAppActions()
  useEffect(() => actions?.registerContext(context, priority), [actions, context.sessionId, context.hostId, context.cwd, context.hatId, priority])
}
