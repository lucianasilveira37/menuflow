'use client'

import { usePathname } from 'next/navigation'
import PublicMenu from './PublicMenu'

export default function MenuRoute() {
  const pathname = usePathname()
  const slug = pathname.split('/').filter(Boolean).pop() || ''

  return <PublicMenu slug={slug} />
}