import type { ReactNode } from 'react'
import { Logo } from '@/components/ui/Icon'
import './auth.css'

function CursorArrow() {
  return (
    <svg width="18" height="20" viewBox="0 0 18 20" fill="currentColor" aria-hidden="true">
      <path d="M1 1l14 7.2-6.2 1.9L6.6 17z" />
    </svg>
  )
}

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth">
      <section className="auth__panel">
        <div className="auth__brand">
          <Logo size={32} />
          DesignHub
        </div>
        {children}
      </section>
      <aside className="auth__stage" aria-hidden="true">
        <div className="poster">
          <div className="poster__disc" />
          <div className="poster__dot" />
          <div className="poster__title">Made together, live.</div>
          <div className="poster__select">
            <i />
            <i />
            <i />
            <i />
          </div>
        </div>
        <div className="cursor-tag cursor-tag--mia">
          <CursorArrow />
          <span>Mia</span>
        </div>
        <div className="cursor-tag cursor-tag--ravi">
          <CursorArrow />
          <span>Ravi</span>
        </div>
        <div className="auth__bubble">
          <b>Mia</b>
          Can we try the headline bigger on the story version?
        </div>
      </aside>
    </div>
  )
}
