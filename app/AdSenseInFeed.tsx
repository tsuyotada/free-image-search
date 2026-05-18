"use client"

// ─────────────────────────────────────────────────────────────────────────────
// AdSenseInFeed — Google AdSense in-feed ad unit
//
// Rendered only in production when both env vars are set.
// Called from PRCard.tsx; do not render this component directly.
//
// If NEXT_PUBLIC_ADSENSE_INFEED_LAYOUT_KEY is set → in-feed fluid format
// Otherwise                                        → auto responsive format
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from "react"

// Resolved at build time by Next.js; empty string when unset.
const CLIENT_ID  = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID          ?? ""
const SLOT_ID    = process.env.NEXT_PUBLIC_ADSENSE_INFEED_SLOT_ID      ?? ""
const LAYOUT_KEY = process.env.NEXT_PUBLIC_ADSENSE_INFEED_LAYOUT_KEY   ?? ""

// Teach TypeScript about the global adsbygoogle array.
declare global {
  interface Window {
    adsbygoogle: unknown[]
  }
}

export default function AdSenseInFeed() {
  const pushed = useRef(false)

  useEffect(() => {
    // Guard against double-push on re-render / React Strict Mode double-invoke
    if (pushed.current) return
    pushed.current = true
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {
      // Silently ignore: ad blocker or script not yet loaded
    }
  }, [])

  const insProps = LAYOUT_KEY
    ? {
        // In-feed / native format — requires an "In-feed ad" unit from AdSense
        "data-ad-format": "fluid",
        "data-ad-layout-key": LAYOUT_KEY,
      }
    : {
        // Responsive display ad — works with any standard ad unit slot
        "data-ad-format": "auto",
        "data-full-width-responsive": "true",
      }

  return (
    /*
     * min-height prevents a completely invisible blank when the ad is
     * blocked or the slot has no fill. 90px ≈ one text-only ad row.
     * AdSense overrides this once a creative is served.
     */
    <ins
      className="adsbygoogle"
      style={{ display: "block", minHeight: 90, width: "100%" }}
      data-ad-client={CLIENT_ID}
      data-ad-slot={SLOT_ID}
      {...insProps}
    />
  )
}
