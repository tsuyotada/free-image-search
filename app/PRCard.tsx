"use client"

// ─────────────────────────────────────────────────────────────────────────────
// PRCard — placeholder sponsored content unit
//
// To replace with a real ad network:
//   • Google AdSense in-feed: swap the JSX below with <ins class="adsbygoogle">
//     and its accompanying <script>. Keep the outer <article> wrapper so
//     the masonry layout is preserved.
//   • Custom sponsor: replace the inner JSX with the sponsor's creative.
//
// The outer <article> must keep: breakInside:"avoid", marginBottom:"16px"
// so it stays in the column flow correctly.
// ─────────────────────────────────────────────────────────────────────────────

const PR_CONTENT = {
  title: "制作コストを支える小さなPR枠",
  body: "Free Stock Finder を続けるためのスポンサー枠です。",
  cta: "詳しく見る",
  href: "#",  // Replace with real URL when a sponsor is set
}

export default function PRCard() {
  return (
    <article
      aria-label="スポンサーコンテンツ"
      style={{
        breakInside: "avoid",
        marginBottom: "16px",
        background: "#ffffff",
        borderRadius: 20,
        overflow: "hidden",
        border: "1px solid #e0e0e0",
        boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
      }}
    >
      {/* Visual area — replace this div with ad creative if needed */}
      <div
        style={{
          height: 130,
          background: "linear-gradient(135deg, #1e1e26 0%, #2a2a38 50%, #1a1a22 100%)",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* PR badge — always visible, cannot be hidden */}
        <span
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            display: "inline-block",
            fontSize: 10,
            fontWeight: 700,
            color: "rgba(255,255,255,0.7)",
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.22)",
            padding: "3px 8px",
            borderRadius: 999,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          PR
        </span>

        {/* Decorative icon */}
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>

      {/* Text content */}
      <div style={{ padding: "12px 14px 14px" }}>
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#1a1a1a",
            margin: "0 0 6px",
            lineHeight: 1.4,
          }}
        >
          {PR_CONTENT.title}
        </p>
        <p
          style={{
            fontSize: 11,
            color: "#767676",
            margin: "0 0 12px",
            lineHeight: 1.5,
          }}
        >
          {PR_CONTENT.body}
        </p>
        <a
          href={PR_CONTENT.href}
          rel="noopener noreferrer sponsored"
          style={{
            display: "inline-block",
            fontSize: 12,
            color: "#505050",
            border: "1px solid #e0e0e0",
            borderRadius: 8,
            padding: "7px 14px",
            textDecoration: "none",
            fontWeight: 500,
            letterSpacing: "0.01em",
          }}
        >
          {PR_CONTENT.cta}
        </a>
      </div>
    </article>
  )
}
