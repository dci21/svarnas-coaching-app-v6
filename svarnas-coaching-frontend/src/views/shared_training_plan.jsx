import { useState, useEffect } from 'react'

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const DAY_LABELS = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' }

function formatDate(raw) {
  if (!raw) return ''
  const d = new Date(raw)
  if (isNaN(d)) return raw
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(-2)
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  if (hh === '00' && min === '00') return `${dd}/${mm}/${yy}`
  return `${dd}/${mm}/${yy} ${hh}:${min}`
}

function SharedTrainingPlan({ slug }) {
  const [planData, setPlanData] = useState(null)
  const [err, setErr] = useState(null)
  const [viewWorkout, setViewWorkout] = useState(null)

  useEffect(() => {
    async function fetchSharedPlan() {
      try {
        const res = await fetch('/api/share/' + slug)
        const body = await res.json()
        if (res.ok) {
          setPlanData(body)
        } else {
          setErr(body.error || 'This training plan is not available anymore')
        }
      } catch {
        setErr('This training plan is not available anymore')
      }
    }
    fetchSharedPlan()
  }, [slug])

  if (err) return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h2>Training Plans that are Shared</h2>
      <p style={{ color: 'crimson' }}>{err}</p>
    </div>
  )

  if (!planData) return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <p>loading...</p>
    </div>
  )

  const meta = planData.generation_metadata || {}
  const weeks = planData.training_plan?.weeks || []

  const weekCardStyle = {
    border: '1px solid #555',
    padding: '10px',
    marginBottom: '12px',
    borderRadius: '4px',
    background: '#1e1e2e'
  }

  const workoutRowStyle = {
    padding: '6px 0',
    borderBottom: '1px solid #333',
    fontSize: '0.9rem'
  }

  const categoryTagStyle = {
    fontSize: '0.75rem',
    padding: '1px 6px',
    borderRadius: '3px',
    marginLeft: '8px',
    background: '#444',
    color: '#ccc'
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h2>Training Plans that are Shared</h2>

      <p style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>
        Training plan of <strong>{planData.public_name || 'Anonymous'}</strong>
      </p>

      <div style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
        {meta.distance && <span>Distance: {meta.distance} &nbsp;|&nbsp; </span>}
        {meta.level && <span>Level: {meta.level} &nbsp;|&nbsp; </span>}
        {meta.race_date && <span>Race: {formatDate(meta.race_date)}</span>}
      </div>

      {weeks.map(week => {
        const sorted = [...week.workouts].sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day))
        return (
          <div key={week.week_number} style={weekCardStyle}>
            <h4>Week {week.week_number}{week.theme ? ` — ${week.theme}` : ''}</h4>
            {week.week_notes && <p style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>{week.week_notes}</p>}
            {sorted.map((wo, idx) => (
              <div key={idx} style={{ ...workoutRowStyle, cursor: 'pointer' }} onClick={() => setViewWorkout(wo)}>
                <strong>{DAY_LABELS[wo.day] || wo.day}</strong> — {wo.title}
                {wo.category && <span style={categoryTagStyle}>{wo.category}</span>}
              </div>
            ))}
          </div>
        )
      })}

      {/* workout details popup */}
      {viewWorkout && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 999
        }}>
          <div style={{
            background: '#1e1e2e', border: '1px solid #555', borderRadius: '6px',
            padding: '1.5rem', maxWidth: '520px', width: '90%', maxHeight: '80vh',
            overflowY: 'auto', position: 'relative'
          }}>
            <button type="button" onClick={() => setViewWorkout(null)}
              style={{ position: 'absolute', top: '10px', right: '14px', background: 'none',
                border: 'none', color: '#ccc', fontSize: '1.2rem', cursor: 'pointer' }}>
              X
            </button>
            <h3 style={{ marginTop: 0 }}>{viewWorkout.title}</h3>
            <p><strong>{DAY_LABELS[viewWorkout.day] || viewWorkout.day}</strong>
              {viewWorkout.category && <span style={categoryTagStyle}>{viewWorkout.category}</span>}
            </p>
            {viewWorkout.blocks && viewWorkout.blocks.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ marginBottom: '6px' }}><strong>Workout Structure:</strong></p>
                {viewWorkout.blocks.map((blk, bi) => {
                  const fmtIntensity = v => {
                    if (!v) return ''
                    if (typeof v === 'string') return v
                    const base = v.base || ''
                    if (v.pct != null) {
                      if (typeof v.pct === 'object' && v.pct.min != null)
                        return Math.round(v.pct.min * 100) + '-' + Math.round(v.pct.max * 100) + '% of ' + base
                      return Math.round(v.pct * 100) + '% of ' + base
                    }
                    return base
                  }
                  const fmtDist = b => {
                    if (b.distance_m != null) {
                      if (typeof b.distance_m === 'object' && b.distance_m.min != null) {
                        return (b.distance_m.min / 1000) + '-' + (b.distance_m.max / 1000) + 'km'
                      }
                      return b.distance_m >= 1000 ? (b.distance_m / 1000) + 'km' : b.distance_m + 'm'
                    }
                    if (b.duration_min != null) return b.duration_min + 'min'
                    return ''
                  }
                  if (blk.type === 'repeats') {
                    return (
                      <div key={bi} style={{ marginBottom: '8px', paddingLeft: '8px', borderLeft: '2px solid #555' }}>
                        <span>{blk.reps}x</span>
                        {blk.steps && blk.steps.map((s, si) => (
                          <div key={si} style={{ paddingLeft: '10px' }}>
                            <div style={{ fontSize: '0.9rem' }}>
                              {fmtDist(s)} {s.type} @{fmtIntensity(s.intensity)}
                            </div>
                            {s.internal_note && <div style={{ fontSize: '0.8rem', fontStyle: 'italic', color: '#999', paddingLeft: '4px' }}>{s.internal_note}</div>}
                          </div>
                        ))}
                      </div>
                    )
                  }
                  return (
                    <div key={bi} style={{ marginBottom: '6px' }}>
                      <div style={{ fontSize: '0.9rem' }}>
                        {fmtDist(blk)} {blk.type} @{fmtIntensity(blk.intensity)}
                      </div>
                      {blk.internal_note && <div style={{ fontSize: '0.8rem', fontStyle: 'italic', color: '#999', paddingLeft: '4px' }}>{blk.internal_note}</div>}
                    </div>
                  )
                })}
              </div>
            )}
            {viewWorkout.session_rpe && <p><strong>RPE:</strong> {viewWorkout.session_rpe}</p>}
            {viewWorkout.surface && <p><strong>Suggested Terrain:</strong> {viewWorkout.surface}</p>}
            {viewWorkout.workout_notes && (
              <div>
                <p style={{ marginBottom: '4px' }}><strong>Workout Notes:</strong></p>
                <p style={{ fontSize: '0.9rem', fontStyle: 'italic' }}>{viewWorkout.workout_notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default SharedTrainingPlan
