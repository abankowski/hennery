import type { ButtonHTMLAttributes } from 'react'
import { Icon, type IconName } from './Icon'
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  small?: boolean
}
export function Button({ variant = 'secondary', small, className = '', type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={`btn btn-${variant}${small ? ' btn-sm' : ''} ${className}`} {...props} />
}
export function IconButton({ icon, label, ...props }: Omit<ButtonProps, 'children' | 'aria-label'> & { icon: IconName; label: string }) {
  return <Button {...props} className={`btn-icon ${props.className ?? ''}`} aria-label={label}><Icon name={icon} /></Button>
}
