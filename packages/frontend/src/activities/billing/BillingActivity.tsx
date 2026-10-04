import { useCallback, useEffect, useState } from 'react'
import type { BillingRecord, Plan, Usage } from '@/models/api'
import { accountApi } from '@/services/api/accountApi'
import { errorMessage, toast } from '@/stores/toastStore'
import { Button } from '@/components/ui/Button'
import { ErrorState, Skeleton } from '@/components/ui/Feedback'
import { confirmDialog } from '@/components/ui/confirm'
import { formatBytes, formatMoney } from '@/utils/common'
import './billing.css'

function Meter({ label, used, limit, format }: { label: string; used: number; limit: number; format?: (n: number) => string }) {
  const fmt = format ?? ((n: number) => n.toLocaleString())
  const pct = Math.min(100, (used / Math.max(1, limit)) * 100)
  return (
    <div className="meter">
      <div className="meter__top">
        <span>{label}</span>
        <span>
          {fmt(used)} of {fmt(limit)}
        </span>
      </div>
      <div className="meter__bar" role="progressbar" aria-label={label} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
        <div className={`meter__fill ${pct > 90 ? 'is-high' : ''}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function BillingActivity() {
  const [usage, setUsage] = useState<Usage | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [history, setHistory] = useState<BillingRecord[]>([])
  const [error, setError] = useState<string | null>(null)
  const [changing, setChanging] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [u, p, h] = await Promise.all([accountApi.usage(), accountApi.plans(), accountApi.billing()])
      setUsage(u)
      setPlans(p)
      setHistory(h)
    } catch (e) {
      setError(errorMessage(e))
    }
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  async function choose(plan: Plan) {
    if (!usage) return
    const downgrade = plan.priceCents < usage.plan.priceCents
    const ok = await confirmDialog({
      title: `Switch to ${plan.name}?`,
      message: downgrade
        ? 'Your limits drop immediately. Existing designs stay, but you may not be able to create new ones until you are under the new limits.'
        : `${plan.name} is ${formatMoney(plan.priceCents)} per month and starts right away.`,
      confirmLabel: `Switch to ${plan.name}`,
    })
    if (!ok) return
    setChanging(plan.code)
    try {
      setUsage(await accountApi.changePlan(plan.code))
      setHistory(await accountApi.billing())
      toast.success(`You are on the ${plan.name} plan`)
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setChanging(null)
    }
  }

  if (error) return <ErrorState message={error} onRetry={() => void load()} />
  if (!usage) return <Skeleton height={360} radius={16} />
  const p = usage.plan

  return (
    <div className="page__inner">
      <div className="page__head">
        <div>
          <h1>Plan and billing</h1>
          <p>
            You are on the <strong>{p.name}</strong> plan{usage.currentPeriodEnd && `, renewing ${new Date(usage.currentPeriodEnd).toLocaleDateString()}`}.
          </p>
        </div>
      </div>

      <section className="card meters">
        <h2>This month’s usage</h2>
        <Meter label="Designs" used={usage.projects} limit={p.maxProjects} />
        <Meter label="Storage" used={usage.storageBytes} limit={p.storageBytes} format={formatBytes} />
        <Meter label="AI requests" used={usage.aiRequests} limit={p.aiRequestsPerMonth} />
        <Meter label="Exports" used={usage.exports} limit={p.exportsPerMonth} />
      </section>

      <div className="plans">
        {plans.map((plan) => {
          const current = plan.code === p.code
          return (
            <section key={plan.code} className={`card plan ${current ? 'is-current' : ''}`}>
              <h3>{plan.name}</h3>
              <div className="plan__price">
                {formatMoney(plan.priceCents)}
                {plan.priceCents > 0 && <small> / month</small>}
              </div>
              <ul>
                <li>{plan.maxProjects.toLocaleString()} designs</li>
                <li>{formatBytes(plan.storageBytes)} storage</li>
                <li>{plan.aiRequestsPerMonth.toLocaleString()} AI requests a month</li>
                <li>{plan.exportsPerMonth.toLocaleString()} exports a month</li>
                <li>
                  {plan.teamSeats} team seat{plan.teamSeats === 1 ? '' : 's'}
                </li>
              </ul>
              <Button variant={current ? 'default' : 'primary'} block disabled={current} loading={changing === plan.code} onClick={() => void choose(plan)}>
                {current ? 'Current plan' : `Choose ${plan.name}`}
              </Button>
            </section>
          )
        })}
      </div>

      <section className="card meters">
        <h2>Billing history</h2>
        {history.length === 0 ? (
          <p style={{ color: 'var(--ink-2)' }}>No charges yet. Paid plan charges appear here.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td>{new Date(h.createdAt).toLocaleDateString()}</td>
                  <td>{h.description}</td>
                  <td>{formatMoney(h.amountCents)}</td>
                  <td>
                    <span className="badge badge--ok">{h.status === 'PAID' ? 'Paid' : h.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
