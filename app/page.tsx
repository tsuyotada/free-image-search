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
}

const HISTORY_KEY = "free-image-search-history"

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

  useEffect(() => {
    const saved = localStorage.getItem(HISTORY_KEY)
    if (saved) {
      setHistory(JSON.parse(saved))
    }

    const updateColumns = () => {
      const width = window.innerWidth
      if (width < 640) setColumnCount(1)
      else if (width < 900) setColumnCount(2)
      else if (width < 1200) setColumnCount(3)
      else setColumnCount(4)
    }

    updateColumns()
    window.addEventListener("resize", updateColumns)

    return () => window.removeEventListener("resize", updateColumns)
  }, [])

  const saveHistory = (word: string) => {
    const trimmed = word.trim()
    if (!trimmed) return

    const next = [trimmed, ...history.filter((item) => item !== trimmed)].slice(0, 16)
    setHistory(next)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
  }

  const search = async (forcedQuery?: string) => {
    const q = (forcedQuery ?? query).trim()
    if (!q) return

    setLoading(true)
    setImages([])
    setVisibleCount(24)

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

  const sanitizeFileName = (name: string) => {
    return name.replace(/[\\/:*?"<>|]/g, "_")
  }

  const handleDownload = async (img: ImageItem) => {
    try {
      const response = await fetch(img.downloadUrl)
      const blob = await response.blob()

      const extension =
        blob.type.includes("png")
          ? "png"
          : blob.type.includes("webp")
            ? "webp"
            : "jpg"

      const fileName = sanitizeFileName(`${img.source}-${img.id}.${extension}`)
      const blobUrl = URL.createObjectURL(blob)

      const a = document.createElement("a")
      a.href = blobUrl
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()

      URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error(error)
      alert("ダウンロードに失敗しました。")
    }
  }

  const filteredImages = images.filter((img) => {
    if (activeTab === "all") return true
    return img.source === activeTab
  })

  const visibleImages = filteredImages.slice(0, visibleCount)
  const hasMore = filteredImages.length > visibleCount

  const resultCountText = useMemo(() => {
    if (loading) return "検索中..."
    if (filteredImages.length === 0) return "画像はまだありません"
    return `${filteredImages.length}件の画像`
  }, [loading, filteredImages.length])

  const accent = "#2aa7a1"
  const accentDark = "#1f8d88"
  const sand = "#f5efe6"
  const sandDeep = "#e8dcc8"
  const card = "#fffdf9"
  const text = "#334155"
  const sub = "#7c8a8b"

  return (
    <main
      style={{
        minHeight: "100vh",
        background: `linear-gradient(180deg, ${sand} 0%, #f8f4ed 100%)`,
        padding: "32px 18px 72px",
        color: text,
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 1380,
          margin: "0 auto",
        }}
      >
        <section
          style={{
            textAlign: "center",
            marginBottom: 28,
          }}
        >
          <h1
            style={{
              fontSize: 44,
              marginBottom: 12,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              color: "#264653",
            }}
          >
            Free Stock Finder
          </h1>

          <p
            style={{
              fontSize: 16,
              color: sub,
              marginBottom: 26,
            }}
          >
            Unsplash・Pexels・Pixabay・Openverse をまとめて検索
          </p>

          <div
            style={{
              maxWidth: 920,
              margin: "0 auto",
              background: "#fffdfa",
              borderRadius: 999,
              display: "flex",
              alignItems: "center",
              padding: "10px 12px 10px 18px",
              boxShadow: "0 10px 30px rgba(71, 85, 105, 0.08)",
              border: `1px solid ${sandDeep}`,
              gap: 10,
            }}
          >
            <div
              style={{
                fontSize: 18,
                color: accentDark,
              }}
            >
              🔎
            </div>

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  search()
                }
              }}
              placeholder="検索ワードを入力（例: cat / interior / 海 / cafe）"
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                fontSize: 17,
                background: "transparent",
                padding: "10px 6px",
                color: "#264653",
              }}
            />

            <button
              onClick={() => search()}
              style={{
                border: "none",
                background: accent,
                color: "#ffffff",
                borderRadius: 999,
                padding: "12px 22px",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 8px 20px rgba(42, 167, 161, 0.28)",
              }}
            >
              検索
            </button>
          </div>
        </section>

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
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            {[
              { key: "all", label: "すべて" },
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
                  border: activeTab === tab.key ? `1px solid ${accent}` : `1px solid ${sandDeep}`,
                  background: activeTab === tab.key ? accent : "#fffdfa",
                  color: activeTab === tab.key ? "#ffffff" : "#4b5563",
                  borderRadius: 999,
                  padding: "10px 16px",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow:
                    activeTab === tab.key
                      ? "0 8px 18px rgba(42, 167, 161, 0.22)"
                      : "none",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div
            style={{
              fontSize: 14,
              color: sub,
              fontWeight: 700,
            }}
          >
            {resultCountText}
          </div>
        </section>

        <section
          style={{
            marginBottom: 26,
            background: "#fffaf3",
            border: `1px solid ${sandDeep}`,
            borderRadius: 24,
            padding: "18px 18px 16px",
            boxShadow: "0 10px 24px rgba(71, 85, 105, 0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                fontSize: 14,
                color: accentDark,
                fontWeight: 800,
              }}
            >
              検索履歴
            </div>

            {history.length > 0 && (
              <button
                onClick={clearHistory}
                style={{
                  border: "none",
                  background: "transparent",
                  color: sub,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                履歴を消す
              </button>
            )}
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            {history.length === 0 ? (
              <span
                style={{
                  color: "#9aa6a7",
                  fontSize: 14,
                }}
              >
                まだ履歴はありません
              </span>
            ) : (
              history.map((item) => (
                <button
                  key={item}
                  onClick={() => search(item)}
                  style={{
                    border: `1px solid ${sandDeep}`,
                    background: "#ffffff",
                    borderRadius: 999,
                    padding: "9px 14px",
                    fontSize: 14,
                    cursor: "pointer",
                    color: "#4b5563",
                    fontWeight: 700,
                  }}
                >
                  {item}
                </button>
              ))
            )}
          </div>
        </section>

        {loading && (
          <section
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "42px 0 54px",
              gap: 16,
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                border: `4px solid ${sandDeep}`,
                borderTop: `4px solid ${accent}`,
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                boxShadow: "0 8px 20px rgba(42, 167, 161, 0.14)",
              }}
            />
            <div
              style={{
                color: accentDark,
                fontWeight: 800,
                fontSize: 15,
                letterSpacing: "0.02em",
              }}
            >
              画像を探しています...
            </div>
          </section>
        )}

        {!loading && (
          <>
            <section
              style={{
                columnCount,
                columnGap: "18px",
              }}
            >
              {visibleImages.map((img) => (
                <article
                  key={img.id}
                  style={{
                    breakInside: "avoid",
                    marginBottom: "18px",
                    background: card,
                    borderRadius: 24,
                    overflow: "hidden",
                    border: `1px solid ${sandDeep}`,
                    boxShadow:
                      hoveredId === img.id
                        ? "0 18px 40px rgba(42, 167, 161, 0.16)"
                        : "0 10px 24px rgba(71, 85, 105, 0.08)",
                    transform:
                      hoveredId === img.id
                        ? "translateY(-4px)"
                        : "translateY(0)",
                    transition: "all 0.22s ease",
                  }}
                  onMouseEnter={() => setHoveredId(img.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <div
                    style={{
                      position: "relative",
                      background: "#f6efe5",
                    }}
                  >
                    <img
                      src={img.thumb}
                      alt={img.author || img.source}
                      style={{
                        width: "100%",
                        height: "auto",
                        display: "block",
                        transition: "transform 0.22s ease, filter 0.22s ease",
                        transform: hoveredId === img.id ? "scale(1.02)" : "scale(1)",
                        filter: hoveredId === img.id ? "saturate(1.03)" : "saturate(1)",
                      }}
                    />

                    <div
                      style={{
                        position: "absolute",
                        top: 12,
                        left: 12,
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          fontSize: 12,
                          fontWeight: 800,
                          color: "#ffffff",
                          background: "rgba(38, 70, 83, 0.78)",
                          padding: "7px 10px",
                          borderRadius: 999,
                          backdropFilter: "blur(8px)",
                        }}
                      >
                        {img.source}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: 14,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 12,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          color: sub,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: 170,
                          fontWeight: 700,
                        }}
                      >
                        {img.author || "Unknown"}
                      </span>

                      <span
                        style={{
                          fontSize: 12,
                          color: accentDark,
                          fontWeight: 800,
                        }}
                      >
                        {img.width && img.height ? `${img.width}×${img.height}` : ""}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDownload(img)}
                      style={{
                        width: "100%",
                        border: "none",
                        textAlign: "center",
                        background: hoveredId === img.id ? accentDark : accent,
                        color: "#ffffff",
                        padding: "13px 14px",
                        borderRadius: 14,
                        fontWeight: 800,
                        fontSize: 15,
                        cursor: "pointer",
                        boxShadow: "0 10px 24px rgba(42, 167, 161, 0.22)",
                        transition: "all 0.2s ease",
                      }}
                    >
                      Download
                    </button>
                  </div>
                </article>
              ))}
            </section>

            {hasMore && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginTop: 30,
                }}
              >
                <button
                  onClick={() => setVisibleCount((prev) => prev + 24)}
                  style={{
                    border: "none",
                    background: accent,
                    color: "#ffffff",
                    padding: "14px 24px",
                    borderRadius: 999,
                    fontWeight: 800,
                    fontSize: 15,
                    cursor: "pointer",
                    boxShadow: "0 10px 24px rgba(42, 167, 161, 0.22)",
                  }}
                >
                  もっと見る
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <style jsx global>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </main>
  )
}