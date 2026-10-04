import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Category, TemplateSummary } from '@/models/api'
import { contentApi } from '@/services/api/contentApi'
import { projectApi } from '@/services/api/projectApi'
import { errorMessage, toast } from '@/stores/toastStore'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { Icon } from '@/components/ui/Icon'
import { categoryColor } from '@/utils/categoryColors'
import { Button } from '@/components/ui/Button'
import { ImportTemplateModal } from '@/components/templates/ImportTemplateModal'
import '@/activities/dashboard/dashboard.css'
import './templates.css'

export default function TemplatesActivity() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryId, setCategoryId] = useState<number | undefined>()
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')
  const [items, setItems] = useState<TemplateSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [using, setUsing] = useState<number | null>(null)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    void contentApi.categories().then(setCategories).catch(() => undefined)
  }, [])
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 250)
    return () => clearTimeout(t)
  }, [q])
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    contentApi
      .templates({ categoryId, q: debounced, size: 48 })
      .then((r) => !cancelled && setItems(r.items))
      .catch((e) => !cancelled && setError(errorMessage(e)))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [categoryId, debounced])

  async function use(t: TemplateSummary) {
    setUsing(t.id)
    try {
      const p = await projectApi.create({ title: t.title, templateId: t.id })
      navigate(`/editor/${p.id}`)
    } catch (e) {
      toast.error(errorMessage(e))
      setUsing(null)
    }
  }

  return (
    <div className="page__inner">
      <div className="page__head">
        <div>
          <h1>Templates</h1>
          <p>Start from a finished layout and make it yours.</p>
        </div>
        <Button icon="upload" onClick={() => setImporting(true)}>
          Import template
        </Button>
        <div className="topbar__search" style={{ maxWidth: 320 }}>
          <Icon name="search" size={16} />
          <input className="input" type="search" placeholder="Search templates" aria-label="Search templates" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      <div className="folders">
        <button className="chip" aria-pressed={!categoryId} onClick={() => setCategoryId(undefined)}>
          All templates
        </button>
        {categories.map((c) => (
          <button key={c.id} className="chip" aria-pressed={categoryId === c.id} onClick={() => setCategoryId(c.id)}>
            <i style={{ width: 8, height: 8, borderRadius: '50%', background: categoryColor(c.slug), marginRight: 8, display: 'inline-block' }} />
            {c.name}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => setDebounced(debounced + '')} />
      ) : loading ? (
        <div className="tgrid">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} height={240} radius={16} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon="template" title="No templates found" message="Try another category or a different search word." />
      ) : (
        <div className="tgrid">
          {items.map((t) => (
            <article key={t.id} className="tcard">
              <button className="tcard__thumb" onClick={() => void use(t)} aria-label={`Use the ${t.title} template`} disabled={using !== null}>
                <img src={t.thumbnail} alt="" loading="lazy" style={{ aspectRatio: `${t.width} / ${t.height}` }} />
                <span className="tcard__cta">
                  <span className="btn btn--primary btn--sm">
                    {using === t.id && <span className="spinner" />}
                    Use template
                  </span>
                </span>
              </button>
              <div className="pcard__title">
                <span>{t.title}</span>
              </div>
              <div className="pcard__meta" style={{ marginTop: -8 }}>
                {t.categoryName} · {t.width} × {t.height}
              </div>
            </article>
          ))}
        </div>
      )}
      {importing && <ImportTemplateModal onClose={() => setImporting(false)} />}
    </div>
  )
}
