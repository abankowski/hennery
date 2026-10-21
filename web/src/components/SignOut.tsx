// Sign out (kernel spec §3.2): `POST /api/auth/logout` ends this browser's
// session, and only once it has does the browser go to the login screen. A
// sign-out that failed (no network, a refusal) says so and stays: the
// cookie is still good, and showing the login screen would claim
// otherwise.
import { useState } from 'react'
import { logOut } from '../api/auth'
import { messageOf } from '../api/errors'
import { Text } from '../lib/text'
import { useClient } from '../app-client'
import { completeLogout } from '../pwa/logout'
import { IconButton } from './ui/Button'

export default function SignOut({ className = 'btn btn-ghost btn-sm', compact = false }: { className?: string; compact?: boolean }) {
  const client = useClient()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signOut = async () => {
    setBusy(true)
    setError(null)
    try {
      await logOut(client)
    } catch (err) {
      setError(messageOf(err))
      setBusy(false)
      return
    }
    // Signed out: the drafts go with the session, their text in
    // sessionStorage and their images in memory, and a send still in flight
    // is let go of, so no composer waits on it. Only here: a failed
    // sign-out keeps them (still signed in), and so does a 401's redirect to
    // the login screen, so work survives an expired session.
    await completeLogout(client)
  }

  return (
    <>
      {compact ? <IconButton icon="arrow-right-on-rectangle" label="Sign out" title="Sign out" variant="ghost" onClick={signOut} disabled={busy} /> : <button type="button" className={className} title="Sign out" onClick={signOut} disabled={busy}>
        Sign out
      </button>}
      {error && (
        <p className="form-error sign-out-error" role="alert">
          Not signed out: this browser is still signed in. <Text>{error}</Text>
        </p>
      )}
    </>
  )
}
