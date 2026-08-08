// Design system component barrel export.
// Import from '@/components/ui' instead of individual files.

export { default as Avatar }   from './Avatar'
export { default as Badge }    from './Badge'
export { default as Button }   from './Button'
export { default as Card }     from './Card'
export { default as Input }    from './Input'
export { default as Modal }    from './Modal'
export { default as Skeleton } from './Skeleton'
export { default as Spinner }  from './Spinner'

// Re-export types consumers commonly need
export type { ButtonVariant, ButtonSize, ButtonProps } from './Button'
export type { BadgeColor, BadgeSize }                  from './Badge'
export type { AvatarSize, AvatarRing }                 from './Avatar'
export type { CardPadding }                            from './Card'
export type { ModalSize, ModalProps }                  from './Modal'
export type { SpinnerSize, SpinnerColor }              from './Spinner'
