"use client"

// 探索 Explore：分页 Feed 网格，点开进入只读预览
// @author hc @date 2026-06-04

import { useEffect, useState } from "react"
import { Loader2, Eye, Heart } from "lucide-react"
import { feedApi } from "@/lib/api"
import type { FeedStreamItemDto } from "@/lib/api"

interface ExploreGridProps {
  onOpen: (item: FeedStreamItemDto) => void
}

const PAGE_SIZE = 24

export function ExploreGrid({ onOpen }: ExploreGridProps) {
  const [items, setItems] = useState<FeedStreamItemDto[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async (p: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await feedApi.getFeedStream({ page: p, pageSize: PAGE_SIZE, sort: 1 })
      setItems((prev) => (p === 1 ? res.data : [...prev, ...res.data]))
      setTotal(res.total)
      setPage(p)
    } catch (e) {
      setError((e as Error).message || "加载失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hasMore = items.length < total

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">探索作品</h2>
        <p className="mt-1 text-sm text-muted-foreground">看看大家做的书籍分析，点开可基于它再生成一份</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => {
          const cover = item.imageUrl || item.imageUrls?.[0] || ""
          return (
            <button
              key={item.id}
              onClick={() => onOpen(item)}
              className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="aspect-[3/4] w-full overflow-hidden bg-secondary/40">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cover}
                    alt={item.name || ""}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                    无封面
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col p-3">
                <p className="line-clamp-2 text-sm font-medium text-foreground">
                  {item.name || item.nameEn || "未命名"}
                </p>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  {item.authorNickname && <span className="truncate">{item.authorNickname}</span>}
                  <span className="ml-auto flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {item.viewCount ?? 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    {item.favoriteCount ?? 0}
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}

      {!loading && hasMore && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => load(page + 1)}
            className="rounded-lg border border-border bg-secondary/50 px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/50"
          >
            加载更多
          </button>
        </div>
      )}

      {!loading && items.length === 0 && !error && (
        <p className="py-12 text-center text-sm text-muted-foreground">暂无作品</p>
      )}
    </div>
  )
}
