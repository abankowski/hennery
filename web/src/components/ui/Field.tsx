import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
interface FieldProps { label: string; hint?: ReactNode; error?: ReactNode; id?: string }
function described(id: string, hint: ReactNode, error: ReactNode, extra?: string) {
  return [extra, hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined
}
function Messages({ id, hint, error }: Omit<FieldProps, 'label'> & { id: string }) {
  return <>{hint && <span className="ui-hint" id={`${id}-hint`}>{hint}</span>}{error && <span className="ui-error" id={`${id}-error`}>{error}</span>}</>
}
export function Input({ label, hint, error, id: given, ...props }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const generated = useId(), id = given ?? generated
  return <div className="field"><label className="field-label" htmlFor={id}>{label}</label><input {...props} id={id} className={`text-input ${props.className ?? ''}`} aria-invalid={error ? true : props['aria-invalid']} aria-describedby={described(id, hint, error, props['aria-describedby'])} /><Messages id={id} hint={hint} error={error} /></div>
}
export function Select({ label, hint, error, id: given, children, ...props }: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const generated = useId(), id = given ?? generated
  return <div className="field"><label className="field-label" htmlFor={id}>{label}</label><select {...props} id={id} className={`ui-select ${props.className ?? ''}`} aria-invalid={error ? true : props['aria-invalid']} aria-describedby={described(id, hint, error, props['aria-describedby'])}>{children}</select><Messages id={id} hint={hint} error={error} /></div>
}
export function Textarea({ label, hint, error, id: given, ...props }: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const generated = useId(), id = given ?? generated
  return <div className="field"><label className="field-label" htmlFor={id}>{label}</label><textarea {...props} id={id} className={`ui-textarea ${props.className ?? ''}`} aria-invalid={error ? true : props['aria-invalid']} aria-describedby={described(id, hint, error, props['aria-describedby'])} /><Messages id={id} hint={hint} error={error} /></div>
}
