import { Suspense } from 'react'
import MenuRoute from './MenuRoute'

export default function PublicMenuPage() {
  return (
    <Suspense fallback={<p>Carregando cardápio...</p>}>
      <MenuRoute />
    </Suspense>
  )
}