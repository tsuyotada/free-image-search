const QUERIES = ["abstract texture", "art aesthetic", "nature landscape", "minimal architecture"]

export async function GET() {
  const q = QUERIES[Math.floor(Math.random() * QUERIES.length)]

  try {
    const res = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(q)}&orientation=landscape`,
      {
        headers: {
          Authorization: `Client-ID ${process.env.UNSPLASH_KEY}`,
        },
      }
    )

    if (!res.ok) {
      return Response.json({ url: null })
    }

    const data = await res.json()
    return Response.json({ url: data?.urls?.regular ?? null })
  } catch {
    return Response.json({ url: null })
  }
}
