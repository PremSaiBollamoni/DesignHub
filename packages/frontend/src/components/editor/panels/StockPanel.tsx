import { useEffect, useRef, useState } from 'react'
import { dragProps } from '@/editor/actions/dropActions'
import { insertAsset } from '@/editor/actions/assetActions'
import type { StockItem, StockProvider } from '@/services/assets/providers'
import { Button } from '@/components/ui/Button'
import { ErrorState, Skeleton, EmptyState } from '@/components/ui/Feedback'
import { PanelShell } from './PanelShell'

interface Props {
  title: string
  provider: StockProvider
  placeholder: string
  defaultQuery: string
  emptyHint: string
  header?: React.ReactNode
}

/** Searchable stock media. Click or drag to place; attribution is shown for every item. */
export function StockPanel({ title, provider, placeholder, defaultQuery, emptyHint, header }: Props) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState(defaultQuery)
  const [items, setItems] = useState<StockItem[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const ctrl = useRef<AbortController | null>(null)

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(query.trim() || defaultQuery)
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [query, defaultQuery])

  useEffect(() => {
    ctrl.current?.abort()
    const c = new AbortController()
    ctrl.current = c
    setLoading(true)
    setError(null)
    provider
      .search(debounced, page, c.signal)
      .then((r) => {
        setItems((cur) => (page === 1 ? r.items : [...cur, ...r.items]))
        setHasMore(r.hasMore)
      })
      .catch((e: Error) => e.name !== 'AbortError' && setError(e.message))
      .finally(() => !c.signal.aborted && setLoading(false))
    return () => c.abort()
  }, [provider, debounced, page])

  return (
    <PanelShell title={title} header={header} search={{ value: query, onChange: setQuery, placeholder }}>
      {error && page === 1 ? (
        <ErrorState message={error} onRetry={() => setPage(1)} />
      ) : (
        <>
          {!loading && items.length === 0 && <EmptyState icon="search" title="Nothing found" message={emptyHint} />}
          <div className="masonry">
            {items.map((it) => (
              <button
                key={it.id}
                title={`${it.title}${it.credit ? ` by ${it.credit}` : ''}${it.license ? ` (${it.license})` : ''}`}
                onClick={() => void insertAsset({ kind: 'image', url: it.url, name: it.title })}
                {...dragProps({ kind: 'image', url: it.url, name: it.title })}
              >
                <img src={it.thumbnail} alt={it.title} loading="lazy" width={it.width} height={it.height} style={{ aspectRatio: `${it.width} / ${it.height}` }} />
              </button>
            ))}
            {loading && Array.from({ length: items.length ? 2 : 8 }, (_, i) => <Skeleton key={i} height={90 + ((i * 37) % 70)} radius={10} />)}
          </div>
          {hasMore && !loading && (
            <Button onClick={() => setPage(page + 1)} block>
              Show more
            </Button>
          )}
          <p className="credit">Free for commercial use from {provider.label}. Each image keeps its creator’s license; hover an image to see it.</p>
        </>
      )}
    </PanelShell>
  )
}
