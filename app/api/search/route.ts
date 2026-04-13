export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get("q")

  if (!query) {
    return Response.json([])
  }

  const unsplashRes = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=12`,
    {
      headers: {
        Authorization: `Client-ID ${process.env.UNSPLASH_KEY}`,
      },
    }
  )
  const unsplashData = await unsplashRes.json()

  const pexelsRes = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=12`,
    {
      headers: {
        Authorization: process.env.PEXELS_KEY!,
      },
    }
  )
  const pexelsData = await pexelsRes.json()

  const unsplashImages =
    unsplashData?.results?.map((img: any) => ({
      id: `unsplash-${img.id}`,
      url: img.urls.regular,
      thumb: img.urls.small,
      source: "Unsplash",
      author: img.user?.name || "",
      downloadUrl: img.links.download,
      pageUrl: img.links.html,
      width: img.width,
      height: img.height,
    })) || []

  const pexelsImages =
    pexelsData?.photos?.map((img: any) => ({
      id: `pexels-${img.id}`,
      url: img.src.large,
      thumb: img.src.medium,
      source: "Pexels",
      author: img.photographer || "",
      downloadUrl: img.src.original,
      pageUrl: img.url,
      width: img.width,
      height: img.height,
    })) || []

  return Response.json([...unsplashImages, ...pexelsImages])
}