const OPENVERSE_LICENSE_NAMES: Record<string, string> = {
  cc0: "CC0",
  pdm: "Public Domain",
  "cc-by": "CC BY",
  "cc-by-sa": "CC BY-SA",
  "cc-by-nc": "CC BY-NC",
  "cc-by-nd": "CC BY-ND",
  "cc-by-nc-sa": "CC BY-NC-SA",
  "cc-by-nc-nd": "CC BY-NC-ND",
}

function formatOpenverseLicense(license: string, version?: string): string {
  if (!license) return ""
  const name = OPENVERSE_LICENSE_NAMES[license.toLowerCase()] ?? license.toUpperCase()
  return version ? `${name} ${version}` : name
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get("q")
  const perPage = Math.min(Number(searchParams.get("per_page") || "12"), 30)

  if (!query) {
    return Response.json([])
  }

  const encoded = encodeURIComponent(query)

  const [unsplashData, pexelsData, pixabayData, openverseData] =
    await Promise.all([
      // ===== Unsplash =====
      fetch(
        `https://api.unsplash.com/search/photos?query=${encoded}&per_page=${perPage}`,
        { headers: { Authorization: `Client-ID ${process.env.UNSPLASH_KEY}` } }
      ).then((r) => r.json()),

      // ===== Pexels =====
      fetch(
        `https://api.pexels.com/v1/search?query=${encoded}&per_page=${perPage}`,
        { headers: { Authorization: process.env.PEXELS_KEY! } }
      ).then((r) => r.json()),

      // ===== Pixabay =====
      fetch(
        `https://pixabay.com/api/?key=${process.env.PIXABAY_KEY}&q=${encoded}&image_type=photo&per_page=${perPage}`
      ).then((r) => r.json()),

      // ===== Openverse =====
      fetch(
        `https://api.openverse.engineering/v1/images?q=${encoded}&page_size=${perPage}`
      ).then((r) => r.json()),
    ])

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
      license: "Unsplash License",
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
      license: "Pexels License",
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
      license: "Pixabay License",
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
          img.width > 300 &&
          img.height > 300
        )
      })
      .slice(0, 24)
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
        license: formatOpenverseLicense(img.license, img.license_version),
      })) || []

  return Response.json([
    ...unsplashImages,
    ...pexelsImages,
    ...pixabayImages,
    ...openverseImages,
  ])
}
