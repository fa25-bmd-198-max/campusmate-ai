import { useState } from 'react'
import { cn } from '@/utils/cn'

const sizeMap = {
  xs: 'h-6  w-6  text-[10px]',
  sm: 'h-8  w-8  text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-xl',
} as const

const ringMap = {
  none:    '',
  sm:      'ring-2 ring-white dark:ring-gray-900',
  md:      'ring-4 ring-white dark:ring-gray-900',
} as const

export type AvatarSize = keyof typeof sizeMap
export type AvatarRing = keyof typeof ringMap

// Generate a consistent background color from a name string
function nameToColor(name: string): string {
  const colors = [
    'bg-rose-500', 'bg-pink-500', 'bg-fuchsia-500', 'bg-violet-500',
    'bg-indigo-500', 'bg-blue-500', 'bg-cyan-500', 'bg-teal-500',
    'bg-emerald-500', 'bg-amber-500', 'bg-orange-500',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

interface AvatarProps {
  src?:       string | null
  name?:      string
  size?:      AvatarSize
  ring?:      AvatarRing
  className?: string
  alt?:       string
}

export default function Avatar({
  src,
  name       = '',
  size       = 'md',
  ring       = 'none',
  className,
  alt,
}: AvatarProps) {
  const [imgError, setImgError] = useState(false)
  const showImage    = !!src && !imgError
  const initials     = getInitials(name)
  const bgColor      = nameToColor(name || 'default')

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full',
        sizeMap[size],
        ringMap[ring],
        !showImage && bgColor,
        className,
      )}
      aria-label={alt ?? (name ? `${name}'s avatar` : 'User avatar')}
      role="img"
    >
      {showImage ? (
        <img
          src={src}
          alt={alt ?? `${name}'s avatar`}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        <span
          className="select-none font-semibold leading-none text-white"
          aria-hidden="true"
        >
          {initials || '?'}
        </span>
      )}
    </span>
  )
}
