import { useEffect, useState } from 'react'
import type { Category } from '@/models/api'
import { contentApi } from '@/services/api/contentApi'
import { Icon } from '@/components/ui/Icon'

interface CreateStripProps {
  onPick: (preset: { title: string; width: number; height: number }) => void
  onCustom: () => void
}

/** Each size is drawn at its real aspect ratio so people choose by shape, not by reading numbers. */
export function CreateStrip({ onPick, onCustom }: CreateStripProps) {
  const [categories, setCategories] = useState<Category[]>([])
  useEffect(() => {
    void contentApi.categories().then(setCategories).catch(() => setCategories([]))
  }, [])

  return (
    <div className="strip" role="list" aria-label="Start a new design">
      {categories.map((c) => {
        const scale = 64 / Math.max(c.width, c.height)
        return (
          <button key={c.id} role="listitem" className="preset" onClick={() => onPick({ title: `Untitled ${c.name.toLowerCase()}`, width: c.width, height: c.height })}>
            <span className="preset__box">
              <span className="preset__shape" style={{ width: Math.max(14, c.width * scale), height: Math.max(14, c.height * scale) }} />
            </span>
            <span className="preset__name">{c.name}</span>
            <span className="preset__size">
              {c.width} × {c.height}
            </span>
          </button>
        )
      })}
      <button role="listitem" className="preset" onClick={onCustom}>
        <span className="preset__box">
          <Icon name="plus" size={26} />
        </span>
        <span className="preset__name">Custom size</span>
      </button>
    </div>
  )
}
