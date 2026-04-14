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

  useEffect(() => {
    const saved = localStorage.getItem(HISTORY_KEY)
    if (saved) {
      setHistory(JSON.parse(saved))
    }
  }, [])

  const saveHistory = (word: string) => {
    const trimmed = word.trim()
    if (!trimmed) return

    const next = [trimmed, ...history.filter((item) => item !== trimmed)].slice(0, 8)
    setHistory(next)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
  }

  const search = async (forcedQuery?: string) => {
    const q = (forcedQuery ?? query).trim()
    if (!q) return

    setLoading(true)

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

  const resultCountText = useMemo(() => {
    if (loading) return "検索中..."
    if (filteredImages.length === 0) return "画像はまだありません"
    return `${filteredImages.length}件の画像`
  }, [loading, filteredImages.length])

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f7f7f8",
        padding: "40px 24px 80px",
        color: "#111827",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
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
              fontSize: 40,
              marginBottom: 10,
              fontWeight: 700,
              letterSpacing: "-0.03em",
            }}
          >
            Free Image Search
          </h1>

          <p
            style={{
              fontSize: 16,
              color: "#6b7280",
              marginBottom: 28,
            }}
          >
            Unsplash・Pexels・Pixabay・Openverse をまとめて検索
          </p>

          <div
            style={{
              maxWidth: 820,
              margin: "0 auto",
              background: "#ffffff",
              borderRadius: 999,
              display: "flex",
              alignItems: "center",
              padding: "10px 12px 10px 20px",
              boxShadow: "0 2px 14px rgba(0,0,0,0.08)",
              border: "1px solid #e5e7eb",
            }}
          >
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  search()
                }
              }}
              placeholder="検索ワードを入力（例: cat / coffee / 海）"
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                fontSize: 17,
                background: "transparent",
                padding: "10px 8px",
              }}
            />

            <button
              onClick={() => search()}
              style={{
                border: "none",
                background: "#111827",
                color: "#ffffff",
                borderRadius: 999,
                padding: "12px 22px",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
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
                  border: activeTab === tab.key ? "1px solid #111827" : "1px solid #d1d5db",
                  background: activeTab === tab.key ? "#111827" : "#ffffff",
                  color: activeTab === tab.key ? "#ffffff" : "#374151",
                  borderRadius: 999,
                  padding: "10px 16px",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        <section
          style={{
            maxWidth: 920,
            margin: "0 auto 26px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                fontSize: 14,
                color: "#6b7280",
                fontWeight: 700,
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
                  color: "#6b7280",
                  cursor: "pointer",
                  fontSize: 13,
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
                  color: "#9ca3af",
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
                    border: "1px solid #d1d5db",
                    background: "#ffffff",
                    borderRadius: 999,
                    padding: "9px 14px",
                    fontSize: 14,
                    cursor: "pointer",
                    color: "#374151",
                  }}
                >
                  {item}
                </button>
              ))
            )}
          </div>
        </section>

        <section
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 18,
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              fontSize: 14,
              color: "#6b7280",
            }}
          >
            {resultCountText}
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 18,
          }}
        >
          {filteredImages.map((img) => (
            <article
              key={img.id}
              style={{
                background: "#ffffff",
                borderRadius: 20,
                overflow: "hidden",
                boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
                border: "1px solid #ececec",
                transition: "transform 0.18s ease, box-shadow 0.18s ease",
                transform:
                  hoveredId === img.id
                    ? "translateY(-4px) scale(1.03)"
                    : "translateY(0) scale(1)",
              }}
              onMouseEnter={() => setHoveredId(img.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "16 / 9",
                  overflow: "hidden",
                  background: "#e5e7eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  src={img.thumb}
                  alt={img.author || img.source}
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "block",
                    objectFit: hoveredId === img.id ? "contain" : "cover",
                    transition: "all 0.22s ease",
                    background: hoveredId === img.id ? "#f3f4f6" : "transparent",
                    padding: hoveredId === img.id ? "8px" : "0px",
                  }}
                />
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
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#111827",
                      background: "#f3f4f6",
                      padding: "6px 10px",
                      borderRadius: 999,
                    }}
                  >
                    {img.source}
                  </span>

                  <span
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: 160,
                    }}
                  >
                    {img.author}
                  </span>
                </div>

                <button
                  onClick={() => handleDownload(img)}
                  style={{
                    width: "100%",
                    border: "none",
                    textAlign: "center",
                    background: "#111827",
                    color: "#ffffff",
                    padding: "13px 14px",
                    borderRadius: 14,
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: "pointer",
                  }}
                >
                  ダウンロード
                </button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}