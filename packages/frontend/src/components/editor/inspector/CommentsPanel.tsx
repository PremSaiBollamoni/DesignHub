import { useEffect, useMemo, useRef, useState } from 'react'
import type { Collaborator, CommentItem } from '@/models/api'
import { sharingApi } from '@/services/api/sharingApi'
import { collabSession } from '@/services/realtime/collabSession'
import { useAuthStore } from '@/stores/authStore'
import { useCollabStore } from '@/stores/collabStore'
import { useEditorStore } from '@/stores/editorStore'
import { errorMessage, toast } from '@/stores/toastStore'
import { Avatar, Tabs } from '@/components/ui/Fields'
import { Button, IconButton } from '@/components/ui/Button'
import { timeAgo } from '@/utils/common'

type Mode = 'comments' | 'chat'

export function CommentsPanel() {
  const [mode, setMode] = useState<Mode>('comments')
  return (
    <div>
      <Tabs<Mode> value={mode} onChange={setMode} tabs={[{ id: 'comments', label: 'Comments' }, { id: 'chat', label: 'Live chat' }]} />
      {mode === 'comments' ? <Comments /> : <Chat />}
    </div>
  )
}

function Composer({ placeholder, onSend, people, autoFocus }: { placeholder: string; onSend: (body: string, mentions: number[]) => Promise<void>; people: Collaborator[]; autoFocus?: boolean }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [picker, setPicker] = useState<string | null>(null)
  const mentioned = useRef<Map<string, number>>(new Map())
  const matches = picker === null ? [] : people.filter((p) => p.name.toLowerCase().includes(picker.toLowerCase())).slice(0, 5)

  function onChange(value: string) {
    setText(value)
    const m = /@([\w ]{0,20})$/.exec(value)
    setPicker(m ? m[1]! : null)
  }
  function pick(p: Collaborator) {
    setText(text.replace(/@([\w ]{0,20})$/, `@${p.name} `))
    mentioned.current.set(p.name, p.userId)
    setPicker(null)
  }
  async function send() {
    const body = text.trim()
    if (!body) return
    setBusy(true)
    try {
      const ids = [...mentioned.current.entries()].filter(([name]) => body.includes(`@${name}`)).map(([, id]) => id)
      await onSend(body, ids)
      setText('')
      mentioned.current.clear()
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="composer">
      <textarea
        className="textarea"
        rows={2}
        value={text}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void send()
        }}
      />
      {matches.map((p) => (
        <button key={p.userId} className="menu-item" onClick={() => pick(p)}>
          <Avatar name={p.name} src={p.avatarUrl} size={22} />
          {p.name}
        </button>
      ))}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="field__hint">Type @ to mention someone</span>
        <Button size="sm" variant="primary" loading={busy} disabled={!text.trim()} onClick={() => void send()}>
          Send
        </Button>
      </div>
    </div>
  )
}

function Comments() {
  const projectId = useEditorStore((s) => s.projectId)
  const access = useEditorStore((s) => s.access)
  const pageId = useEditorStore((s) => s.currentPageId)
  const selection = useEditorStore((s) => s.selection)
  const comments = useCollabStore((s) => s.comments)
  const me = useAuthStore((s) => s.user)!
  const [people, setPeople] = useState<Collaborator[]>([])
  const [replyTo, setReplyTo] = useState<number | null>(null)
  const [showResolved, setShowResolved] = useState(false)
  const canComment = access !== 'VIEWER'

  useEffect(() => {
    void sharingApi.collaborators(projectId).then(setPeople).catch(() => undefined)
  }, [projectId])

  const threads = useMemo(() => {
    const roots = comments.filter((c) => !c.parentId && (showResolved || !c.resolved))
    return roots.map((r) => ({ root: r, replies: comments.filter((c) => c.parentId === r.id) }))
  }, [comments, showResolved])

  async function add(body: string, mentions: number[], parentId?: number) {
    const elementId = !parentId && selection.length === 1 ? selection[0] : undefined
    const c = await sharingApi.addComment(projectId, { body, mentions, parentId, pageId, elementId })
    useCollabStore.getState().upsertComment(c)
    setReplyTo(null)
  }

  async function act(fn: () => Promise<unknown>) {
    try {
      await fn()
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <div style={{ display: 'grid', gap: 12, paddingTop: 12 }}>
      {canComment ? (
        <Composer
          people={people}
          placeholder={selection.length === 1 ? 'Comment on the selected element' : 'Comment on this page'}
          onSend={(b, m) => add(b, m)}
        />
      ) : (
        <p className="field__hint">You have view-only access, so you cannot comment.</p>
      )}
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
        <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} /> Show resolved comments
      </label>
      {threads.length === 0 && <p className="help">No comments yet. Start the conversation above.</p>}
      {threads.map(({ root, replies }) => (
        <div key={root.id} className={`thread ${root.resolved ? 'is-resolved' : ''}`}>
          <Message c={root} />
          {replies.map((r) => (
            <Message key={r.id} c={r} />
          ))}
          <div style={{ display: 'flex', gap: 4 }}>
            {canComment && (
              <Button size="sm" variant="ghost" onClick={() => setReplyTo(replyTo === root.id ? null : root.id)}>
                Reply
              </Button>
            )}
            {canComment && (
              <Button size="sm" variant="ghost" onClick={() => void act(async () => useCollabStore.getState().upsertComment(await sharingApi.resolveComment(projectId, root.id, !root.resolved)))}>
                {root.resolved ? 'Reopen' : 'Resolve'}
              </Button>
            )}
            {(root.authorId === me.id || access === 'OWNER') && (
              <IconButton icon="trash" size="sm" label="Delete comment thread" onClick={() => void act(async () => { await sharingApi.deleteComment(projectId, root.id); useCollabStore.getState().removeComment(root.id) })} />
            )}
          </div>
          {replyTo === root.id && <Composer autoFocus people={people} placeholder="Write a reply" onSend={(b, m) => add(b, m, root.id)} />}
        </div>
      ))}
    </div>
  )
}

function Message({ c }: { c: CommentItem }) {
  return (
    <div className="msg">
      <Avatar name={c.authorName} src={c.authorAvatar} size={28} />
      <div>
        <b>{c.authorName}</b>
        <small>{timeAgo(c.createdAt)}</small>
        <p>{c.body}</p>
      </div>
    </div>
  )
}

function Chat() {
  const chat = useCollabStore((s) => s.chat)
  const presence = useCollabStore((s) => s.presence)
  const me = useAuthStore((s) => s.user)!
  const [text, setText] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => endRef.current?.scrollIntoView({ block: 'end' }), [chat.length])
  const others = presence.filter((p) => p.userId !== me.id)

  return (
    <div style={{ display: 'grid', gap: 10, paddingTop: 12 }}>
      <p className="field__hint">{others.length ? `${others.length} other ${others.length === 1 ? 'person is' : 'people are'} here now.` : 'Only you are here right now. Messages are not saved after you leave.'}</p>
      <div style={{ display: 'grid', gap: 10, maxHeight: 'calc(100vh - 340px)', overflowY: 'auto' }}>
        {chat.map((m) => (
          <div key={m.id} className="msg">
            <Avatar name={m.name} size={28} />
            <div>
              <b>{m.userId === me.id ? 'You' : m.name}</b>
              <p>{m.text}</p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!text.trim()) return
          collabSession.sendChat(text.trim())
          setText('')
        }}
        style={{ display: 'flex', gap: 6 }}
      >
        <input className="input" placeholder="Message everyone here" aria-label="Chat message" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
        <Button type="submit" variant="primary" disabled={!text.trim()}>
          Send
        </Button>
      </form>
    </div>
  )
}
