import { lookup } from "node:dns/promises"
import { isIP } from "node:net"

export const runtime = "nodejs"

// Unsplash serves the full-resolution original (commonly 3–10 MB), which is
// larger than a serverless function is allowed to return in a buffered
// response. Its download endpoint is also the event that Unsplash requires us
// to fire on every download, so it is resolved through the API host and the
// browser is then sent straight to the CDN.
const UNSPLASH_API_HOST = "api.unsplash.com"
const UNSPLASH_WEB_HOST = "unsplash.com"

function sanitizeFileName(name: string) {
  return name.replace(/[\\/:*?"<>|\x00-\x1f]/g, "_").slice(0, 200) || "image.jpg"
}

// filename= is ASCII-only, so a UTF-8 filename* is added alongside it.
function contentDisposition(filename: string) {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_")
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`
}

function isPrivateAddress(ip: string) {
  if (ip.includes(":")) {
    const v6 = ip.toLowerCase()
    const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    if (mapped) return isPrivateAddress(mapped[1])
    return (
      v6 === "::" ||
      v6 === "::1" ||
      v6.startsWith("fc") ||
      v6.startsWith("fd") ||
      v6.startsWith("fe80")
    )
  }

  const [a, b] = ip.split(".").map(Number)
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  )
}

// This route fetches a URL supplied by the client, so it must not be usable as
// a proxy into the private network (cloud metadata endpoints in particular).
async function resolvePublicUrl(raw: string): Promise<URL | null> {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }

  if (url.protocol !== "https:") return null

  const host = url.hostname.replace(/^\[|\]$/g, "")
  if (isIP(host)) return isPrivateAddress(host) ? null : url
  if (/(^|\.)(localhost|local|internal|localdomain)$/i.test(host)) return null

  try {
    const addresses = await lookup(host, { all: true })
    if (addresses.length === 0) return null
    if (addresses.some(({ address }) => isPrivateAddress(address))) return null
  } catch {
    return null
  }

  return url
}

// Accepts either links.download_location (api.unsplash.com/photos/:id/download)
// or the older links.download (unsplash.com/photos/:id/download) and returns the
// API endpoint for it, preserving the ixid Unsplash asks us to pass through.
function toUnsplashApiDownloadUrl(url: URL): URL | null {
  if (url.hostname === UNSPLASH_API_HOST) return url

  if (url.hostname === UNSPLASH_WEB_HOST || url.hostname === `www.${UNSPLASH_WEB_HOST}`) {
    const id = url.pathname.match(/^\/photos\/(?:.*-)?([^/]+)\/download\/?$/)?.[1]
    if (!id) return null
    const api = new URL(`https://${UNSPLASH_API_HOST}/photos/${id}/download`)
    const ixid = url.searchParams.get("ixid")
    if (ixid) api.searchParams.set("ixid", ixid)
    return api
  }

  return null
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get("url")
  const filename = sanitizeFileName(searchParams.get("filename") || "image.jpg")

  if (!url) {
    return new Response("Missing url", { status: 400 })
  }

  const target = await resolvePublicUrl(url)

  if (!target) {
    return new Response("Unsupported url", { status: 400 })
  }

  try {
    const unsplashApiUrl = toUnsplashApiDownloadUrl(target)

    if (unsplashApiUrl) {
      // Registers the download with Unsplash (required by their API guidelines)
      // and returns the CDN url to hand the browser.
      const res = await fetch(unsplashApiUrl, {
        headers: { Authorization: `Client-ID ${process.env.UNSPLASH_KEY}` },
        cache: "no-store",
      })

      if (!res.ok) {
        console.error(`Unsplash download endpoint failed: ${res.status}`)
        return new Response("Failed to fetch image", { status: 502 })
      }

      const { url: cdnUrl } = (await res.json()) as { url?: string }

      if (!cdnUrl) {
        return new Response("Failed to fetch image", { status: 502 })
      }

      // `dl` makes the Unsplash CDN send Content-Disposition: attachment, so the
      // file still downloads under our filename without passing through here.
      const redirect = new URL(cdnUrl)
      redirect.searchParams.set("dl", filename)

      return Response.redirect(redirect, 302)
    }

    const upstream = await fetch(target, { cache: "no-store" })

    if (!upstream.ok || !upstream.body) {
      return new Response("Failed to fetch image", { status: 502 })
    }

    const contentType =
      upstream.headers.get("content-type") || "application/octet-stream"
    const contentLength = upstream.headers.get("content-length")

    // Streamed rather than buffered: a buffered body is capped at 4.5 MB on
    // Vercel, which large originals exceed.
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": contentDisposition(filename),
        "Cache-Control": "no-store",
        ...(contentLength ? { "Content-Length": contentLength } : {}),
      },
    })
  } catch (error) {
    console.error(error)
    return new Response("Download failed", { status: 500 })
  }
}
