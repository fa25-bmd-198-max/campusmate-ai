import type { ReactNode, HTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

const paddingMap = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' } as const
export type CardPadding = keyof typeof paddingMap

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?:    CardPadding
  borderless?: boolean
  muted?:      boolean
}

function Card({ padding = 'md', borderless = false, muted = false, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-xl transition-shadow shadow-card', paddingMap[padding], className)}
      style={{
        backgroundColor: muted ? '#faf8f5' : '#ffffff',
        border: borderless ? undefined : '1px solid #ddd6cc',
      }}
      {...props}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> { action?: ReactNode }

function CardHeader({ action, className, children, ...props }: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4 pb-4', className)}
         style={{ borderBottom: '1px solid #ede8e0' }} {...props}>
      <div className="min-w-0 flex-1">{children}</div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-h3 font-semibold', className)}
        style={{ color: '#36454f' }} {...props}>
      {children}
    </h3>
  )
}

function CardDescription({ className, children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('mt-0.5 text-body', className)}
       style={{ color: '#6b7c87' }} {...props}>
      {children}
    </p>
  )
}

function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('', className)} {...props}>{children}</div>
}

function CardFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('pt-4', className)}
         style={{ borderTop: '1px solid #ede8e0' }} {...props}>
      {children}
    </div>
  )
}

Card.Header      = CardHeader
Card.Title       = CardTitle
Card.Description = CardDescription
Card.Content     = CardContent
Card.Footer      = CardFooter

export default Card
