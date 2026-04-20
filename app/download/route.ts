export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get("url")
  const filename = searchParams.get("filename") || "image.jpg"

  if (!url) {
    return new Response("Missing url", { status: 400 })
  }

  try {
    const upstream = await fetch(url)

    if (!upstream.ok) {
      return new Response("Failed to fetch image", { status: 502 })
    }

    const contentType =
      upstream.headers.get("content-type") || "application/octet-stream"

    const arrayBuffer = await upstream.arrayBuffer()

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error(error)
    return new Response("Download failed", { status: 500 })
  }
}