// The hat selector (frontend spec §5): every hat, or one. The hats are the
// server's; the app never computes a session's hat.
import type { HatItem } from '../generated/protocol'
import { HatChip } from './ui'

interface Props {
  hats: readonly HatItem[] | null
  /** The selected hat's id, `''` for every hat. */
  hat: string
  onHat: (hat: string) => void
}

export default function HatSwitch({ hats, hat, onHat }: Props) {
  const choices = [{ id: '', name: 'All hats', colour: undefined }, ...(hats ?? []).map((h) => ({ id: h.id, name: h.name, colour: h.colour }))]
  return (
    <div className="hat-switch list-hats" role="group" aria-label="Hat">
      {choices.map((c) => (
        <button
          key={c.id || '*'}
          type="button"
          className={'chip' + (hat === c.id ? ' on' : '')}
          aria-pressed={hat === c.id}
          aria-label={c.name}
          onClick={() => onHat(c.id)}
        >
          {c.id ? <HatChip colour={c.colour}><bdi>{c.name}</bdi></HatChip> : <bdi>{c.name}</bdi>}
        </button>
      ))}
    </div>
  )
}
