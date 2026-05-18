import { preload } from 'react-dom'
import HomeClient from './HomeClient'

const HERO_QUERIES = ["abstract texture", "art aesthetic", "nature landscape", "minimal architecture"]

async function fetchHeroImageUrl(): Promise<string | null> {
  const q = HERO_QUERIES[Math.floor(Math.random() * HERO_QUERIES.length)]
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    const res = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(q)}&orientation=landscape`,
      {
        headers: { Authorization: `Client-ID ${process.env.UNSPLASH_KEY}` },
        cache: 'no-store',
        signal: controller.signal,
      }
    )
    clearTimeout(timeout)
    if (!res.ok) return null
    const data = await res.json()
    return (data?.urls?.regular as string | undefined) ?? null
  } catch {
    return null
  }
}

export default async function Page() {
  const initialHeroImage = await fetchHeroImageUrl()
  if (initialHeroImage) {
    preload(initialHeroImage, { as: 'image', fetchPriority: 'high' })
  }
  return <HomeClient initialHeroImage={initialHeroImage} />
}
