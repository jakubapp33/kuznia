import { NavLink, Outlet, useLocation } from 'react-router'
import { useEffect } from 'react'
import { fmtClock } from '../lib/format'
import { addTime, stopTimer, useTimer } from '../lib/timer'
import { Icon } from './Icon'

const TABS = [
  { to: '/', label: 'Dziś', icon: 'home' },
  { to: '/trening', label: 'Trening', icon: 'dumbbell' },
  { to: '/cwiczenia', label: 'Ćwiczenia', icon: 'book' },
  { to: '/dieta', label: 'Dieta', icon: 'apple' },
  { to: '/postep', label: 'Postęp', icon: 'chart' },
]

function TimerBar() {
  const t = useTimer()
  if (!t.running) return null
  const done = t.remaining <= 0
  return (
    <div className={'timer-bar' + (done ? ' done' : '')} role="timer" aria-live="polite">
      <Icon name="timer" />
      <div className="t">{done ? '0:00' : fmtClock(t.remaining)}</div>
      <div className="spacer small" style={{ fontWeight: 600 }}>{done ? 'Czas na serię!' : 'Przerwa'}</div>
      {!done && <button onClick={() => addTime(-15)}>−15</button>}
      {!done && <button onClick={() => addTime(15)}>+15</button>}
      <button onClick={stopTimer}>{done ? 'OK' : 'Pomiń'}</button>
      {!done && <div className="progress" style={{ width: `${(1 - t.remaining / Math.max(1, t.total)) * 100}%` }} />}
    </div>
  )
}

export function Layout() {
  const { pathname } = useLocation()
  const t = useTimer()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return (
    <div className={'app' + (t.running ? ' has-timer' : '')}>
      <Outlet />
      <TimerBar />
      <div className="tabbar">
        <nav>
          {TABS.map((tab) => (
            <NavLink key={tab.to} to={tab.to} end={tab.to === '/'}>
              <Icon name={tab.icon} size={24} stroke={tab.icon === 'dumbbell' ? 2.4 : 2} />
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
