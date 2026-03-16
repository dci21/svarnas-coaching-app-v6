import { useState, useEffect } from 'react'

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

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

function MyTrainingPlans({ token, navigateBack }) {
  const [myTrainingPlansList, setMyTrainingPlansList] = useState(null)
  const [activeTrainiingPlan, setActiveTrainiingPlan] = useState(null)
  const [err, setErr] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [successMsg, setSuccessMsg] = useState(null)
  const [shareInfo, setShareInfo] = useState(null)
  const [shareCopied, setShareCopied] = useState(false)
  const [viewWorkout, setViewWorkout] = useState(null)

  useEffect(() => {
    loadPlans()
  }, [token])

  async function loadPlans() {
    try {
      const res = await fetch('/api/training-plans', {
        headers: { Authorization: 'Bearer ' + token }
      })
      if (!res.ok) throw new Error()
      setMyTrainingPlansList(await res.json())
    } catch {
      setErr('error while generating trainig plan')
    }
  }

  async function handleGenerate() {
    setErr(null)
    setSuccessMsg(null)
    setGenerating(true)
    try {
      const res = await fetch('/api/training-plans/generate', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token }
      })
      const body = await res.json()
      if (res.ok) {
        setSuccessMsg('Your training plan is ready!')
        loadPlans()
      } else {
        setErr(body.error)
      }
    } catch {
      setErr('error while generating trainig plan')
    }
    setGenerating(false)
  }

  async function viewPlan(planId) {
    setErr(null)
    setShareInfo(null)
    setShareCopied(false)
    try {
      const res = await fetch('/api/training-plans/' + planId, {
        headers: { Authorization: 'Bearer ' + token }
      })
      if (!res.ok) throw new Error()
      setActiveTrainiingPlan(await res.json())
    } catch {
      setErr('error while generating trainig plan')
    }
  }

  async function handleShare(planId) {
    setShareCopied(false)
    try {
      const res = await fetch('/api/share/create-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token
        },
        body: JSON.stringify({ plan_id: planId })
      })
      const body = await res.json()
      if (res.ok) {
        setShareInfo({ share_id: body.share_id, link: body.link })
        const fullUrl = window.location.origin + '/share/' + body.link
        navigator.clipboard.writeText(fullUrl)
        setShareCopied(true)
      } else {
        setErr(body.error)
      }
    } catch {
      setErr('error while generating trainig plan')
    }
  }

  async function handleStopSharing() {
    if (!shareInfo) return
    try {
      const res = await fetch('/api/share/' + shareInfo.share_id, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + token }
      })
      if (res.ok) {
        setShareInfo(null)
        setShareCopied(false)
      }
    } catch {
      setErr('error while generating trainig plan')
    }
  }

  const cardStyle = {
    border: '1px solid #444',
    padding: '12px',
    marginBottom: '10px',
    borderRadius: '4px',
    background: '#2a2a3e',
    cursor: 'pointer'
  }

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

  const metaLabelStyle = {
    fontWeight: 'bold',
    paddingRight: '16px',
    paddingBottom: '4px'
  }

  const categoryTagStyle = {
    fontSize: '0.75rem',
    padding: '1px 6px',
    borderRadius: '3px',
    marginLeft: '8px',
    background: '#444',
    color: '#ccc'
  }

  if (activeTrainiingPlan) {
    const meta = activeTrainiingPlan.generation_metadata || {}
    const weeks = activeTrainiingPlan.training_plan?.weeks || []

    return (
      <div>
        <button type="button" onClick={() => setActiveTrainiingPlan(null)} style={{ marginBottom: '1rem' }}>
          &#8592;
        </button>
        <h2>Training Plan</h2>

        <div style={{ marginBottom: '1rem' }}>
          {!shareInfo && (
            <button type="button" onClick={() => handleShare(activeTrainiingPlan.plan_id)}>
              Share my training plan
            </button>
          )}
          {shareInfo && (
            <span>
              <span style={{ color: 'green', marginRight: '10px' }}>
                {shareCopied ? 'Copied' : ''}
              </span>
              <code style={{ fontSize: '0.8rem', background: '#333', padding: '3px 6px' }}>
                {window.location.origin}/share/{shareInfo.link}
              </code>
              {' '}
              <button type="button" onClick={handleStopSharing} style={{ marginLeft: '8px' }}>
                Stop Sharing
              </button>
            </span>
          )}
        </div>

        <h3>Generation Metadata</h3>
        <table style={{ borderCollapse: 'collapse', marginBottom: '1.5rem' }}>
          <tbody>
            {meta.distance && <tr><td style={metaLabelStyle}>Distance</td><td>{meta.distance}</td></tr>}
            {meta.level && <tr><td style={metaLabelStyle}>Level</td><td>{meta.level}</td></tr>}
            {meta.race_date && <tr><td style={metaLabelStyle}>Race Date</td><td>{formatDate(meta.race_date)}</td></tr>}
            {/* respect the order of the days in the week */}
            {meta.availability && <tr><td style={metaLabelStyle}>Availability</td><td>{[...meta.availability].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b)).join(', ')}</td></tr>}
            {meta.long_run_day && <tr><td style={metaLabelStyle}>Long Run Day</td><td>{meta.long_run_day}</td></tr>}
            {meta.runs_per_week != null && <tr><td style={metaLabelStyle}>Runs/Week</td><td>{meta.runs_per_week}</td></tr>}
            {meta.template_id && <tr><td style={metaLabelStyle}>Template</td><td>{meta.template_id}</td></tr>}
            {meta.generated_at && <tr><td style={metaLabelStyle}>Generated</td><td>{formatDate(meta.generated_at)}</td></tr>}
          </tbody>
        </table>

        {weeks.map(week => {
          const sorted = [...week.workouts].sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day))
          return (
            <div key={week.week_number} style={weekCardStyle}>
              <h4>Week {week.week_number}{week.theme ? ` — ${week.theme}` : ''}</h4>
              {week.week_notes && <p style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>{week.week_notes}</p>}
              {sorted.map((wo, idx) => (
                <div key={idx} style={{ ...workoutRowStyle, cursor: 'pointer' }} onClick={() => setViewWorkout(wo)}>
                  <strong>{wo.day}</strong> — {wo.title}
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
              <p><strong>{viewWorkout.day}</strong>
                {viewWorkout.category && <span style={categoryTagStyle}>{viewWorkout.category}</span>}
              </p>
              {viewWorkout.workout_notes && <p><em>Notes:</em> {viewWorkout.workout_notes}</p>}
              {viewWorkout.session_rpe && <p><em>RPE:</em> {viewWorkout.session_rpe}</p>}
              {viewWorkout.surface && <p><em>Terrain:</em> {viewWorkout.surface}</p>}
              {viewWorkout.blocks && viewWorkout.blocks.length > 0 && (
                <div>
                  <p style={{ marginBottom: '4px' }}><em>Workout:</em></p>
                  {viewWorkout.blocks.map((blk, bi) => {
                    const fmtIntensity = v => !v ? '' : typeof v === 'string' ? v : v.base || ''
                    const fmtDist = b => b.distance_m != null
                      ? (b.distance_m >= 1000 ? (b.distance_m / 1000) + 'km' : b.distance_m + 'm')
                      : b.duration_min != null ? b.duration_min + 'min' : ''
                    if (blk.type === 'repeats') {
                      return (
                        <div key={bi} style={{ marginBottom: '6px', paddingLeft: '8px', borderLeft: '2px solid #555' }}>
                          <span>{blk.reps}x</span>
                          {blk.steps && blk.steps.map((s, si) => (
                            <div key={si} style={{ paddingLeft: '10px', fontSize: '0.85rem' }}>
                              {fmtDist(s)} {s.type} @{fmtIntensity(s.intensity)}
                            </div>
                          ))}
                        </div>
                      )
                    }
                    return (
                      <div key={bi} style={{ marginBottom: '4px', fontSize: '0.9rem' }}>
                        {fmtDist(blk)} {blk.type} @{fmtIntensity(blk.intensity)}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (!myTrainingPlansList && !err) return <p>loading...</p>

  return (
    <div>
      <button type="button" onClick={navigateBack} style={{ marginBottom: '1rem' }}>
        &#8592;
      </button>
      <h2>My Training Plans</h2>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={generating}
        style={{ marginBottom: '1rem' }}
      >
        {generating ? 'generating...' : 'Generate a new Training Plan'}
      </button>

      {successMsg && <p style={{ color: 'green' }}>{successMsg}</p>}
      {err && <p style={{ color: 'crimson' }}>{err}</p>}

      {myTrainingPlansList && myTrainingPlansList.length === 0 && (
        <p>You have 0 training plans.</p>
      )}

      {myTrainingPlansList && myTrainingPlansList.map(plan => {
        const m = plan.generation_metadata || {}
        return (
          <div key={plan.plan_id} style={cardStyle} onClick={() => viewPlan(plan.plan_id)}>
            <strong>{m.distance} {m.level}</strong>
            <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
              {plan.created && <span>Created: {formatDate(plan.created)}</span>}
              {m.race_date && <span> &nbsp;|&nbsp; Race: {formatDate(m.race_date)}</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default MyTrainingPlans
