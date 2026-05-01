"use client"

import { useEffect, useMemo, useState } from "react"

type ImageItem = {
  id: string
  url: string
  thumb: string
  source: string
  author: string
  downloadUrl: string
  pageUrl: string
  width?: number
  height?: number
  license?: string
}

function isCommercialSafe(license?: string): boolean {
  if (!license) return false
  const u = license.toUpperCase()
  if (u.includes("NC")) return false
  if (u.includes("ND")) return false
  if (u === "ALL RIGHTS RESERVED") return false
  return true
}

type DownloadHistoryItem = {
  historyId: string
  id: string
  thumb: string
  source: string
  author: string
  pageUrl: string
  downloadedAt: string
}

const HISTORY_KEY = "free-image-search-history"
const DOWNLOAD_HISTORY_KEY = "free-image-search-dl-history"
const FADE_MS = 650

// ── Monochrome palette ──────────────────────────────────────────────────────
// ヒーロー・Pinterest 画面どちらでも同じ世界観に見えるよう、
// ターコイズ・サンドベージュを廃してグレーの階調に統一する。
const bg       = "#f3f3f3"   // ページ背景
const bgDeep   = "#e9e9e9"   // グラデーション終端
const bgCard   = "#ffffff"   // カード・検索バー
const border   = "#e0e0e0"   // 通常ボーダー
const text     = "#1a1a1a"   // 一次テキスト
const sub      = "#767676"   // 二次テキスト
const muted    = "#b2b2b2"   // ミュートテキスト
const ink      = "#313131"   // プライマリボタン（チャコール）
const inkDark  = "#1a1a1a"   // ボタンホバー

export default function Home() {
  const [query, setQuery] = useState("")
  const [images, setImages] = useState<ImageItem[]>([])
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<
    "all" | "Unsplash" | "Pexels" | "Pixabay" | "Openverse"
  >("all")
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [columnCount, setColumnCount] = useState(4)
  const [visibleCount, setVisibleCount] = useState(24)
  const [heroImage, setHeroImage] = useState<string | null>(null)
  const [heroPhase, setHeroPhase] = useState<"visible" | "fading" | "hidden">("visible")
  const [downloadHistory, setDownloadHistory] = useState<DownloadHistoryItem[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [mode, setMode] = useState<"normal" | "ai">("normal")
  const [aiPrompt, setAiPrompt] = useState("")
  const [commercialOnly, setCommercialOnly] = useState(true)
  const [aiQueries, setAiQueries] = useState<string[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState("")

  useEffect(() => {
    const saved = localStorage.getItem(HISTORY_KEY)
    if (saved) setHistory(JSON.parse(saved))

    const savedDl = localStorage.getItem(DOWNLOAD_HISTORY_KEY)
    if (savedDl) setDownloadHistory(JSON.parse(savedDl))

    const updateColumns = () => {
      const w = window.innerWidth
      if (w < 640) setColumnCount(1)
      else if (w < 900) setColumnCount(2)
      else if (w < 1200) setColumnCount(3)
      else setColumnCount(4)
    }
    updateColumns()
    window.addEventListener("resize", updateColumns)

    fetch("/api/hero")
      .then((r) => r.json())
      .then((data) => { if (data.url) setHeroImage(data.url) })
      .catch(() => {})

    return () => window.removeEventListener("resize", updateColumns)
  }, [])

  const saveHistory = (word: string) => {
    const trimmed = word.trim()
    if (!trimmed) return
    const next = [trimmed, ...history.filter((i) => i !== trimmed)].slice(0, 16)
    setHistory(next)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
  }

  const search = async (forcedQuery?: string) => {
    const q = (forcedQuery ?? query).trim()
    if (!q) return

    setHeroPhase("fading")
    setLoading(true)
    setImages([])
    setVisibleCount(24)
    setTimeout(() => setHeroPhase("hidden"), FADE_MS)

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setImages(data)
      setQuery(q)
      saveHistory(q)
    } catch (error) {
      console.error(error)
      setImages([])
    } finally {
      setLoading(false)
    }
  }

  const clearHistory = () => {
    setHistory([])
    localStorage.removeItem(HISTORY_KEY)
  }

  const sanitizeFileName = (name: string) => name.replace(/[\\/:*?"<>|]/g, "_")

  const handleDownload = (img: ImageItem) => {
    try {
      const extension = img.downloadUrl.includes(".png")
        ? "png"
        : img.downloadUrl.includes(".webp")
          ? "webp"
          : "jpg"
      const fileName = sanitizeFileName(`${img.source}-${img.id}.${extension}`)
      const a = document.createElement("a")
      a.href = `/api/download?url=${encodeURIComponent(img.downloadUrl)}&filename=${encodeURIComponent(fileName)}`
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()

      const entry: DownloadHistoryItem = {
        historyId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        id: img.id,
        thumb: img.thumb,
        source: img.source,
        author: img.author,
        pageUrl: img.pageUrl,
        downloadedAt: new Date().toISOString(),
      }
      setDownloadHistory((prev) => {
        const next = [entry, ...prev]
        localStorage.setItem(DOWNLOAD_HISTORY_KEY, JSON.stringify(next))
        return next
      })
    } catch (error) {
      console.error(error)
      alert("ダウンロードに失敗しました。")
    }
  }

  const clearDownloadHistory = () => {
    setDownloadHistory([])
    localStorage.removeItem(DOWNLOAD_HISTORY_KEY)
  }

  const searchAiRecommend = async () => {
    const prompt = aiPrompt.trim()
    if (!prompt) return

    setHeroPhase("fading")
    setAiLoading(true)
    setAiError("")
    setAiQueries([])
    setImages([])
    setVisibleCount(24)
    setTimeout(() => setHeroPhase("hidden"), FADE_MS)

    try {
      const aiRes = await fetch("/api/ai-recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      })
      const aiData = await aiRes.json()
      if (!aiRes.ok || !aiData.queries) {
        setAiError(aiData.error || "AIの処理に失敗しました。")
        return
      }

      const queries: string[] = aiData.queries
      setAiQueries(queries)

      const results = await Promise.all(
        queries.map((q) =>
          fetch(`/api/search?q=${encodeURIComponent(q)}&per_page=6`)
            .then((r) => r.json())
            .catch(() => [])
        )
      )

      const seenIds = new Set<string>()
      const merged: ImageItem[] = []
      for (const batch of results) {
        for (const img of batch) {
          if (!seenIds.has(img.id)) {
            seenIds.add(img.id)
            merged.push(img)
          }
        }
      }
      setImages(merged)
    } catch (error) {
      console.error(error)
      setAiError("ネットワークエラーが発生しました。")
    } finally {
      setAiLoading(false)
    }
  }

  const filteredImages = images.filter((img) => {
    if (activeTab !== "all" && img.source !== activeTab) return false
    if (commercialOnly && !isCommercialSafe(img.license)) return false
    return true
  })
  const visibleImages = filteredImages.slice(0, visibleCount)
  const hasMore = filteredImages.length > visibleCount

  const resultCountText = useMemo(() => {
    if (loading) return "Searching..."
    if (filteredImages.length === 0) return "No images yet"
    return `${filteredImages.length} photos`
  }, [loading, filteredImages.length])

  return (
    <>
      {/* ── Hero（visible / fading 中のみ存在） ── */}
      {heroPhase !== "hidden" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundImage: heroImage ? `url(${heroImage})` : undefined,
            backgroundColor: heroImage ? undefined : "#111111",
            backgroundSize: "cover",
            backgroundPosition: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Arial, Helvetica, sans-serif",
            zIndex: 10,
            opacity: heroPhase === "visible" ? 1 : 0,
            transform: heroPhase === "visible" ? "scale(1)" : "scale(1.04)",
            transition: `opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease`,
            pointerEvents: heroPhase === "fading" ? "none" : "auto",
            willChange: "opacity, transform",
          }}
        >
          {/* オーバーレイ：純粋なブラック系グレデーション */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.48) 100%)",
            }}
          />

          {/* 中央コンテンツ */}
          <div
            style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "100%",
              maxWidth: 860,
              padding: "0 18px",
            }}
          >
            {/* ── サイト名（ヒーロー）：post-search と同じ 28px に揃える ── */}
            <h1
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "#ffffff",
                letterSpacing: "-0.02em",
                marginBottom: 6,
                textShadow: "0 1px 12px rgba(0,0,0,0.45)",
                textAlign: "center",
              }}
            >
              Free Stock Finder
            </h1>

            {/* ディスクリプション（英語・控えめ） */}
            <p
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.50)",
                marginBottom: 18,
                textAlign: "center",
                letterSpacing: "0.01em",
              }}
            >
              Search across Unsplash, Pexels, Pixabay &amp; Openverse
            </p>

            {/* モード切替トグル（ヒーロー） */}
            <div
              style={{
                display: "inline-flex",
                background: "rgba(255,255,255,0.12)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.22)",
                borderRadius: 999,
                padding: 3,
                marginBottom: 16,
                gap: 2,
              }}
            >
              {(["normal", "ai"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setAiError("") }}
                  style={{
                    border: "none",
                    background: mode === m ? "rgba(255,255,255,0.22)" : "transparent",
                    color: mode === m ? "#ffffff" : "rgba(255,255,255,0.55)",
                    borderRadius: 999,
                    padding: "7px 16px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    letterSpacing: "0.01em",
                    transition: "background 0.15s ease, color 0.15s ease",
                    whiteSpace: "nowrap",
                  }}
                >
                  {m === "normal" ? "Search" : "AI Recommend"}
                </button>
              ))}
            </div>

            {/* ガラス風検索バー（通常モード） */}
            {mode === "normal" && (
              <div
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.14)",
                  backdropFilter: "blur(18px)",
                  WebkitBackdropFilter: "blur(18px)",
                  borderRadius: 999,
                  display: "flex",
                  alignItems: "center",
                  padding: "8px 8px 8px 20px",
                  border: "1px solid rgba(255,255,255,0.28)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.24)",
                  gap: 8,
                }}
              >
                <div
                  style={{ fontSize: 17, color: "rgba(255,255,255,0.65)", flexShrink: 0 }}
                >
                  🔎
                </div>

                <input
                  className="hero-input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") search() }}
                  placeholder="Search photos (e.g. cat, interior, landscape…)"
                  style={{
                    flex: 1,
                    border: "none",
                    outline: "none",
                    fontSize: 16,
                    background: "transparent",
                    padding: "10px 6px",
                    color: "#ffffff",
                  }}
                />

                <button
                  onClick={() => search()}
                  style={{
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "rgba(15,15,15,0.65)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    color: "#ffffff",
                    borderRadius: 999,
                    padding: "11px 22px",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    letterSpacing: "0.01em",
                  }}
                >
                  Search
                </button>
              </div>
            )}

            {/* AI Recommend 入力（ヒーロー） */}
            {mode === "ai" && (
              <div style={{ width: "100%" }}>
                <div
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.14)",
                    backdropFilter: "blur(18px)",
                    WebkitBackdropFilter: "blur(18px)",
                    borderRadius: 20,
                    border: "1px solid rgba(255,255,255,0.28)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.24)",
                    padding: "14px 16px 12px",
                  }}
                >
                  <textarea
                    className="hero-textarea"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="どんな写真がほしいですか？（例：地方の小さなカフェに使う、温かくて静かな朝の写真）"
                    rows={3}
                    style={{
                      width: "100%",
                      border: "none",
                      outline: "none",
                      fontSize: 15,
                      background: "transparent",
                      color: "#ffffff",
                      resize: "none",
                      lineHeight: 1.6,
                      fontFamily: "Arial, Helvetica, sans-serif",
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                    <button
                      onClick={searchAiRecommend}
                      disabled={aiLoading}
                      style={{
                        border: "1px solid rgba(255,255,255,0.18)",
                        background: aiLoading ? "rgba(255,255,255,0.10)" : "rgba(15,15,15,0.65)",
                        backdropFilter: "blur(12px)",
                        WebkitBackdropFilter: "blur(12px)",
                        color: "#ffffff",
                        borderRadius: 999,
                        padding: "10px 22px",
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: aiLoading ? "default" : "pointer",
                        letterSpacing: "0.01em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {aiLoading ? "生成中…" : "写真を提案してもらう"}
                    </button>
                  </div>
                </div>
                {aiError && (
                  <div style={{ marginTop: 10, fontSize: 13, color: "rgba(255,255,255,0.60)", textAlign: "center" }}>
                    {aiError}
                  </div>
                )}
              </div>
            )}

            {/* 検索履歴チップ（ヒーロー内） */}
            {history.length > 0 && (
              <div style={{ marginTop: 20, width: "100%" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      color: "rgba(255,255,255,0.40)",
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    Recent
                  </span>

                  <button
                    onClick={clearHistory}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "rgba(255,255,255,0.35)",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    Clear
                  </button>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {history.slice(0, 10).map((item) => (
                    <button
                      key={item}
                      onClick={() => search(item)}
                      style={{
                        border: "1px solid rgba(255,255,255,0.20)",
                        background: "rgba(255,255,255,0.10)",
                        backdropFilter: "blur(8px)",
                        WebkitBackdropFilter: "blur(8px)",
                        borderRadius: 999,
                        padding: "7px 13px",
                        fontSize: 13,
                        cursor: "pointer",
                        color: "rgba(255,255,255,0.82)",
                        fontWeight: 500,
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 検索後レイアウト（常時レンダリング、ヒーロー中は opacity 0） ── */}
      <main
        style={{
          minHeight: "100vh",
          background: `linear-gradient(180deg, ${bg} 0%, ${bgDeep} 100%)`,
          padding: "32px 18px 72px",
          color: text,
          fontFamily: "Arial, Helvetica, sans-serif",
          opacity: heroPhase === "visible" ? 0 : 1,
          transition: `opacity ${FADE_MS}ms ease`,
          pointerEvents: heroPhase === "visible" ? "none" : "auto",
        }}
      >
        <div style={{ maxWidth: 1380, margin: "0 auto" }}>

          {/* ── ヘッダー ── */}
          <section style={{ textAlign: "center", marginBottom: 20 }}>
            <h1
              style={{
                fontSize: 12,
                fontWeight: 400,
                color: sub,
                letterSpacing: "0.02em",
                lineHeight: 1.5,
                marginBottom: 14,
              }}
            >
              Free Stock Finder &nbsp;·&nbsp; Search across Unsplash, Pexels, Pixabay &amp; Openverse
            </h1>

            {/* モード切替トグル */}
            <div
              style={{
                display: "inline-flex",
                border: `1px solid ${border}`,
                borderRadius: 999,
                background: bgCard,
                padding: 3,
                marginBottom: 12,
                gap: 2,
              }}
            >
              {(["normal", "ai"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setAiError("") }}
                  style={{
                    border: "none",
                    background: mode === m ? ink : "transparent",
                    color: mode === m ? "#ffffff" : muted,
                    borderRadius: 999,
                    padding: "7px 16px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    letterSpacing: "0.01em",
                    transition: "background 0.15s ease, color 0.15s ease",
                  }}
                >
                  {m === "normal" ? "Search" : "AI Recommend"}
                </button>
              ))}
            </div>

            {/* 通常検索バー */}
            {mode === "normal" && (
              <div
                style={{
                  maxWidth: 920,
                  margin: "0 auto",
                  background: bgCard,
                  borderRadius: 999,
                  display: "flex",
                  alignItems: "center",
                  padding: "9px 9px 9px 18px",
                  boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
                  border: `1px solid ${border}`,
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 17, color: muted, flexShrink: 0 }}>🔎</div>

                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") search() }}
                  placeholder="Search photos (e.g. cat, interior, landscape…)"
                  style={{
                    flex: 1,
                    border: "none",
                    outline: "none",
                    fontSize: 16,
                    background: "transparent",
                    padding: "9px 6px",
                    color: text,
                  }}
                />

                <button
                  onClick={() => search()}
                  style={{
                    border: "none",
                    background: ink,
                    color: "#ffffff",
                    borderRadius: 999,
                    padding: "11px 22px",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    letterSpacing: "0.01em",
                    flexShrink: 0,
                  }}
                >
                  Search
                </button>
              </div>
            )}

            {/* AI Recommend 入力エリア */}
            {mode === "ai" && (
              <div style={{ maxWidth: 920, margin: "0 auto" }}>
                <div
                  style={{
                    background: bgCard,
                    borderRadius: 20,
                    border: `1px solid ${border}`,
                    boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
                    padding: "14px 18px 12px",
                  }}
                >
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="どんな写真がほしいですか？（例：地方の小さなカフェのWebサイトに使う、温かくて静かな朝の写真がほしい）"
                    rows={3}
                    style={{
                      width: "100%",
                      border: "none",
                      outline: "none",
                      fontSize: 15,
                      background: "transparent",
                      color: text,
                      resize: "none",
                      lineHeight: 1.6,
                      fontFamily: "Arial, Helvetica, sans-serif",
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                    <button
                      onClick={searchAiRecommend}
                      disabled={aiLoading}
                      style={{
                        border: "none",
                        background: aiLoading ? muted : ink,
                        color: "#ffffff",
                        borderRadius: 999,
                        padding: "10px 22px",
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: aiLoading ? "default" : "pointer",
                        letterSpacing: "0.01em",
                        transition: "background 0.15s ease",
                      }}
                    >
                      {aiLoading ? "生成中…" : "写真を提案してもらう"}
                    </button>
                  </div>
                </div>
                {aiError && (
                  <div
                    style={{
                      marginTop: 10,
                      fontSize: 13,
                      color: sub,
                      textAlign: "center",
                    }}
                  >
                    {aiError}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ── AI生成クエリ表示 ── */}
          {aiQueries.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <span style={{ fontSize: 11, color: muted, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                AI queries
              </span>
              {aiQueries.map((q) => (
                <span
                  key={q}
                  style={{
                    fontSize: 11,
                    color: sub,
                    background: bgCard,
                    border: `1px solid ${border}`,
                    borderRadius: 999,
                    padding: "3px 10px",
                  }}
                >
                  {q}
                </span>
              ))}
            </div>
          )}

          {/* ── タブ＋件数 ── */}
          <section
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 18,
            }}
          >
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                { key: "all", label: "All" },
                { key: "Unsplash", label: "Unsplash" },
                { key: "Pexels", label: "Pexels" },
                { key: "Pixabay", label: "Pixabay" },
                { key: "Openverse", label: "Openverse" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() =>
                    setActiveTab(
                      tab.key as "all" | "Unsplash" | "Pexels" | "Pixabay" | "Openverse"
                    )
                  }
                  style={{
                    border:
                      activeTab === tab.key
                        ? `1px solid ${ink}`
                        : `1px solid ${border}`,
                    background: activeTab === tab.key ? ink : bgCard,
                    color: activeTab === tab.key ? "#ffffff" : sub,
                    borderRadius: 999,
                    padding: "9px 16px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    letterSpacing: "0.01em",
                    boxShadow: "none",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {/* 商用利用フィルタトグル */}
              <button
                onClick={() => setCommercialOnly((v) => !v)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 30,
                    height: 17,
                    borderRadius: 999,
                    background: commercialOnly ? ink : border,
                    position: "relative",
                    transition: "background 0.2s",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: 2,
                      left: commercialOnly ? 15 : 2,
                      width: 13,
                      height: 13,
                      borderRadius: 999,
                      background: "#ffffff",
                      transition: "left 0.2s",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    }}
                  />
                </span>
                <span style={{ fontSize: 12, color: sub, fontWeight: 500, whiteSpace: "nowrap" }}>
                  商用利用OKのみ
                </span>
              </button>

              <div style={{ fontSize: 13, color: muted, fontWeight: 500 }}>
                {resultCountText}
              </div>
              <button
                onClick={() => setShowHistory(true)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: muted,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  padding: 0,
                  letterSpacing: "0.01em",
                  textDecoration: "underline",
                  textDecorationColor: border,
                  textUnderlineOffset: 3,
                }}
              >
                History {downloadHistory.length > 0 ? `(${downloadHistory.length})` : ""}
              </button>
            </div>
          </section>

          {/* ── 検索履歴 ── */}
          <section
            style={{
              marginBottom: 24,
              background: bgCard,
              border: `1px solid ${border}`,
              borderRadius: 20,
              padding: "16px 18px 14px",
              boxShadow: "0 1px 8px rgba(0,0,0,0.04)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 11,
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: muted,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Recent searches
              </div>

              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: muted,
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  Clear
                </button>
              )}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {history.length === 0 ? (
                <span style={{ color: muted, fontSize: 13 }}>No history yet</span>
              ) : (
                history.map((item) => (
                  <button
                    key={item}
                    onClick={() => search(item)}
                    style={{
                      border: `1px solid ${border}`,
                      background: bg,
                      borderRadius: 999,
                      padding: "8px 14px",
                      fontSize: 13,
                      cursor: "pointer",
                      color: sub,
                      fontWeight: 500,
                    }}
                  >
                    {item}
                  </button>
                ))
              )}
            </div>
          </section>

          {/* ── ローディング ── */}
          {loading && (
            <section
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "48px 0 60px",
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  border: `3px solid ${border}`,
                  borderTop: `3px solid ${ink}`,
                  borderRadius: "50%",
                  animation: "spin 0.9s linear infinite",
                }}
              />
              <div
                style={{
                  color: sub,
                  fontWeight: 500,
                  fontSize: 14,
                  letterSpacing: "0.02em",
                }}
              >
                Searching…
              </div>
            </section>
          )}

          {/* ── 画像グリッド ── */}
          {!loading && (
            <>
              <section style={{ columnCount, columnGap: "16px" }}>
                {visibleImages.map((img) => (
                  <article
                    key={img.id}
                    style={{
                      breakInside: "avoid",
                      marginBottom: "16px",
                      background: bgCard,
                      borderRadius: 20,
                      overflow: "hidden",
                      border: `1px solid ${border}`,
                      boxShadow:
                        hoveredId === img.id
                          ? "0 12px 32px rgba(0,0,0,0.12)"
                          : "0 2px 10px rgba(0,0,0,0.05)",
                      transform:
                        hoveredId === img.id ? "translateY(-3px)" : "translateY(0)",
                      transition: "box-shadow 0.22s ease, transform 0.22s ease",
                    }}
                    onMouseEnter={() => setHoveredId(img.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <div style={{ position: "relative", background: "#f0f0f0" }}>
                      <img
                        src={img.thumb}
                        alt={img.author || img.source}
                        style={{
                          width: "100%",
                          height: "auto",
                          display: "block",
                          transition: "transform 0.22s ease",
                          transform: hoveredId === img.id ? "scale(1.02)" : "scale(1)",
                        }}
                      />

                      {/* ソースバッジ */}
                      <div
                        style={{
                          position: "absolute",
                          top: 10,
                          left: 10,
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            fontSize: 11,
                            fontWeight: 600,
                            color: "#ffffff",
                            background: "rgba(10,10,10,0.68)",
                            padding: "5px 10px",
                            borderRadius: 999,
                            backdropFilter: "blur(8px)",
                            letterSpacing: "0.02em",
                          }}
                        >
                          {img.source}
                        </span>
                      </div>
                    </div>

                    <div style={{ padding: "12px 14px 14px" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 11,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            color: muted,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: 170,
                            fontWeight: 400,
                          }}
                        >
                          {img.author || "Unknown"}
                        </span>

                        <span
                          style={{
                            fontSize: 11,
                            color: muted,
                            fontWeight: 400,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {img.width && img.height ? `${img.width}×${img.height}` : ""}
                        </span>
                      </div>

                      {/* ライセンスバッジ */}
                      {img.license && (
                        <div style={{ marginBottom: 9 }}>
                          <span
                            style={{
                              fontSize: 10,
                              color: muted,
                              background: bg,
                              border: `1px solid ${border}`,
                              borderRadius: 6,
                              padding: "2px 7px",
                              letterSpacing: "0.02em",
                              fontWeight: 500,
                            }}
                          >
                            {img.license}
                          </span>
                        </div>
                      )}

                      {/* Download：黒CTAではなく「上品な操作ボタン」として軽く見せる */}
                      <button
                        onClick={() => handleDownload(img)}
                        style={{
                          width: "100%",
                          border: "1px solid #e4e4e4",
                          textAlign: "center",
                          background: hoveredId === img.id ? "#e6e6e6" : "#f0f0f0",
                          color: hoveredId === img.id ? "#222222" : "#505050",
                          padding: "9px 14px",
                          borderRadius: 12,
                          fontWeight: 500,
                          fontSize: 13,
                          cursor: "pointer",
                          letterSpacing: "0.01em",
                          transition: "background 0.18s ease, color 0.18s ease",
                        }}
                      >
                        Download
                      </button>

                      {img.pageUrl && (
                        <a
                          href={img.pageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "block",
                            textAlign: "center",
                            marginTop: 8,
                            fontSize: 11,
                            color: muted,
                            textDecoration: "none",
                            letterSpacing: "0.01em",
                          }}
                        >
                          元ページを見る
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </section>

              {hasMore && (
                <div
                  style={{ display: "flex", justifyContent: "center", marginTop: 32 }}
                >
                  <button
                    onClick={() => setVisibleCount((prev) => prev + 24)}
                    style={{
                      border: `1px solid ${border}`,
                      background: bgCard,
                      color: sub,
                      padding: "12px 28px",
                      borderRadius: 999,
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: "pointer",
                      letterSpacing: "0.01em",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                    }}
                  >
                    Load more
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <style jsx global>{`
        @keyframes spin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .hero-input::placeholder {
          color: rgba(255, 255, 255, 0.45);
        }
        .hero-textarea::placeholder {
          color: rgba(255, 255, 255, 0.40);
        }
        input::placeholder {
          color: #b2b2b2;
        }
        textarea::placeholder {
          color: #b2b2b2;
        }
      `}</style>

      {/* ── ダウンロード履歴モーダル ── */}
      {showHistory && (
        <div
          onClick={() => setShowHistory(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.38)",
            zIndex: 50,
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            paddingTop: 60,
            overflowY: "auto",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: bgCard,
              borderRadius: 20,
              width: "100%",
              maxWidth: 680,
              margin: "0 18px 60px",
              boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
              border: `1px solid ${border}`,
              overflow: "hidden",
            }}
          >
            {/* モーダルヘッダー */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "18px 22px 16px",
                borderBottom: `1px solid ${border}`,
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 700, color: text, letterSpacing: "-0.01em" }}>
                Download History
              </div>
              <button
                onClick={() => setShowHistory(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: muted,
                  fontSize: 20,
                  cursor: "pointer",
                  lineHeight: 1,
                  padding: "2px 6px",
                }}
              >
                ✕
              </button>
            </div>

            {/* モーダルボディ */}
            <div style={{ padding: "8px 0 4px" }}>
              {downloadHistory.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "56px 24px",
                    color: muted,
                    fontSize: 14,
                  }}
                >
                  ダウンロード履歴はまだありません
                </div>
              ) : (
                (() => {
                  const grouped: Record<string, DownloadHistoryItem[]> = {}
                  for (const item of downloadHistory) {
                    const d = new Date(item.downloadedAt)
                    const key = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`
                    if (!grouped[key]) grouped[key] = []
                    grouped[key].push(item)
                  }
                  return Object.entries(grouped).map(([date, items]) => (
                    <div key={date}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: muted,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          padding: "14px 22px 8px",
                        }}
                      >
                        {date}
                      </div>
                      {items.map((item) => {
                        const d = new Date(item.downloadedAt)
                        const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
                        return (
                          <div
                            key={item.historyId}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 14,
                              padding: "10px 22px",
                              borderTop: `1px solid ${border}`,
                            }}
                          >
                            <img
                              src={item.thumb}
                              alt={item.author || item.source}
                              style={{
                                width: 56,
                                height: 40,
                                objectFit: "cover",
                                borderRadius: 8,
                                flexShrink: 0,
                                background: "#e9e9e9",
                              }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: sub,
                                    background: bg,
                                    border: `1px solid ${border}`,
                                    borderRadius: 999,
                                    padding: "2px 8px",
                                    flexShrink: 0,
                                  }}
                                >
                                  {item.source}
                                </span>
                                <span
                                  style={{
                                    fontSize: 12,
                                    color: muted,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {item.author || "Unknown"}
                                </span>
                              </div>
                              {item.pageUrl && (
                                <a
                                  href={item.pageUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    fontSize: 11,
                                    color: muted,
                                    textDecoration: "none",
                                    borderBottom: `1px solid ${border}`,
                                    paddingBottom: 1,
                                  }}
                                >
                                  元ページを見る
                                </a>
                              )}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: muted,
                                flexShrink: 0,
                              }}
                            >
                              {time}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))
                })()
              )}
            </div>

            {/* モーダルフッター */}
            {downloadHistory.length > 0 && (
              <div
                style={{
                  padding: "12px 22px 16px",
                  borderTop: `1px solid ${border}`,
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  onClick={clearDownloadHistory}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: muted,
                    fontSize: 12,
                    cursor: "pointer",
                    padding: 0,
                    fontWeight: 500,
                    textDecoration: "underline",
                    textDecorationColor: border,
                    textUnderlineOffset: 3,
                  }}
                >
                  履歴をすべて削除
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
