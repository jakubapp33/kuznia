import { Link, useNavigate, useParams } from 'react-router'
import { Icon } from '../components/Icon'
import { TopBar } from '../components/ui'
import { TEMPLATE_MAP } from '../data/plans'
import { db, setSetting } from '../db/db'
import { useExercises } from '../lib/hooks'

export function fmtRest(sec: number) {
  if (sec < 60) return `${sec} s`
  return sec % 60 ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')} min` : `${sec / 60} min`
}

export function TemplateView() {
  const { id } = useParams()
  const nav = useNavigate()
  const t = TEMPLATE_MAP.get(id ?? '')
  const { map } = useExercises()
  if (!t) return <div className="page"><TopBar title="Nie znaleziono" /></div>

  async function adopt() {
    const planId = await db.plans.add({
      name: t!.name,
      description: t!.description,
      days: structuredClone(t!.days),
      templateId: t!.id,
      createdAt: Date.now(),
    })
    await setSetting('activePlanId', planId)
    nav('/trening')
  }

  return (
    <div className="page">
      <TopBar title={t.name} back="/trening" />
      <div className="card stack">
        <div className="hstack wrap">
          <span className="pill accent">{t.level}</span>
          <span className="pill">{t.perWeek}</span>
          <span className="pill">{t.equipment}</span>
        </div>
        <div>{t.description}</div>
      </div>

      <div className="section-title">Dlaczego tak?</div>
      <div className="card">
        <ul className="steps" style={{ listStyle: 'disc' }}>
          {t.why.map((w, i) => <li key={i} className="small">{w}</li>)}
        </ul>
      </div>

      {t.days.map((d) => (
        <div key={d.id} className="stack" style={{ gap: 8 }}>
          <div className="section-title">{d.name}</div>
          <div className="card flush list">
            {d.exercises.map((pe, i) => {
              const ex = map.get(pe.exerciseId)
              const unit = ex?.load === 'time' ? ' s' : ''
              return (
                <Link key={i} to={`/cwiczenia/${pe.exerciseId}`} className="row">
                  <div className="grow">
                    <div className="title">{ex?.pl ?? pe.exerciseId}</div>
                    <div className="meta">
                      {pe.sets} × {pe.repMin}–{pe.repMax}{unit} · zapas {pe.rir} powt. · przerwa {fmtRest(pe.restSec)}
                    </div>
                  </div>
                  <Icon name="info" className="chev" size={18} />
                </Link>
              )
            })}
          </div>
        </div>
      ))}

      <div className="note small">
        <b>RIR (zapas)</b> – ile powtórzeń mógłbyś jeszcze zrobić na końcu serii. RIR 2 = kończysz serię, gdy czujesz, że dałbyś radę jeszcze dwa.
      </div>

      <button className="btn primary lg block" onClick={adopt}>
        <Icon name="check" /> Wybieram ten plan
      </button>
      <div className="tiny muted" style={{ textAlign: 'center' }}>Plan trafi do „Moich planów” – możesz go potem dowolnie zmieniać.</div>
    </div>
  )
}
