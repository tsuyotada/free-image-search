export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get("q")

  if (!query) {
    return Response.json([])
  }

  // ===== Unsplash =====
  const unsplashRes = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=12`,
    {
      headers: {
        Authorization: `Client-ID ${process.env.UNSPLASH_KEY}`,
      },
    }
  )
  const unsplashData = await unsplashRes.json()

  // ===== Pexels =====
  const pexelsRes = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=12`,
    {
      headers: {
        Authorization: process.env.PEXELS_KEY!,
      },
    }
  )
  const pexelsData = await pexelsRes.json()

  // ===== Pixabay（追加）=====
  const pixabayRes = await fetch(
    `https://pixabay.com/api/?key=${process.env.PIXABAY_KEY}&q=${encodeURIComponent(query)}&image_type=photo&per_page=12`
  )
  const pixabayData = await pixabayRes.json()

  // ===== 整形 =====
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

  const pixabayImages =
    pixabayData?.hits?.map((img: any) => ({
      id: `pixabay-${img.id}`,
      url: img.largeImageURL,
      thumb: img.webformatURL,
      source: "Pixabay",
      author: img.user || "",
      downloadUrl: img.largeImageURL,
      pageUrl: img.pageURL,
      width: img.imageWidth,
      height: img.imageHeight,
    })) || []

  // ===== 全部まとめて返す =====
  return Response.json([
    ...unsplashImages,
    ...pexelsImages,
    ...pixabayImages
  ])
}