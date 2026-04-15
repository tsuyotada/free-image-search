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

  // ===== Pixabay =====
  const pixabayRes = await fetch(
    `https://pixabay.com/api/?key=${process.env.PIXABAY_KEY}&q=${encodeURIComponent(query)}&image_type=photo&per_page=12`
  )
  const pixabayData = await pixabayRes.json()

  // ===== Openverse =====
  const openverseRes = await fetch(
    `https://api.openverse.engineering/v1/images?q=${encodeURIComponent(query)}&page_size=20`
  )
  const openverseData = await openverseRes.json()

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

  // ===== Openverse（ノイズ削減）=====
  const openverseImages =
    openverseData?.results
      ?.filter((img: any) => {
        return (
          img.url &&
          img.thumbnail &&
          img.width &&
          img.height &&
          img.width > 300 &&   // 小さすぎ除外
          img.height > 300     // 小さすぎ除外
        )
      })
      .slice(0, 24) // 件数制限
      .map((img: any) => ({
        id: `openverse-${img.id}`,
        url: img.url,
        thumb: img.thumbnail || img.url,
        source: "Openverse",
        author: img.creator || "",
        downloadUrl: img.url,
        pageUrl: img.foreign_landing_url,
        width: img.width,
        height: img.height,
      })) || []

  // ===== 全部まとめる =====
  return Response.json([
    ...unsplashImages,
    ...pexelsImages,
    ...pixabayImages,
    ...openverseImages,
  ])
}