import { createContext, useContext, type ReactNode } from 'react'

export interface QuestionPresentation {
  selected: string | null
  select: (pending: string | null) => void
  acknowledge: (text: string) => void
  next: () => void
  writePrompt: () => void
}
export const QuestionPresentationContext = createContext<QuestionPresentation | null>(null)

/** One canonical action set stays inside its card in the accessibility tree.
 * On phones the selected set occupies the bottom answer region. Fields stay
 * mounted in the transcript and their drafts remain owned by AnswerBook. */
export default function QuestionActions({ pendingId, children }: { pendingId: string; children: ReactNode }) {
  const presentation = useContext(QuestionPresentationContext)
  const selected = presentation?.selected === pendingId
  return <div className={'question-actions' + (selected ? ' question-actions-selected' : '')} aria-label="Question actions">
    {children}
    {selected && <div className="question-navigation"><button type="button" className="btn btn-ghost btn-sm" onClick={presentation.writePrompt}>Write a prompt</button><button type="button" className="btn btn-ghost btn-sm" onClick={presentation.next}>Next question</button></div>}
  </div>
}
