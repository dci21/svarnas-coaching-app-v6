import { useState, useEffect } from 'react'

function MyTrainingPlans({ token, navigateBack }) {
  const [myTrainingPlansList, setMyTrainingPlansList] = useState(null)
  const [activeTrainiingPlan, setActiveTrainiingPlan] = useState(null)
  const [err, setErr] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [successMsg, setSuccessMsg] = useState(null)

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

        <h3>Generation Metadata</h3>
        <table style={{ borderCollapse: 'collapse', marginBottom: '1.5rem' }}>
          <tbody>
            {meta.distance && <tr><td style={metaLabelStyle}>Distance</td><td>{meta.distance}</td></tr>}
            {meta.level && <tr><td style={metaLabelStyle}>Level</td><td>{meta.level}</td></tr>}
            {meta.race_date && <tr><td style={metaLabelStyle}>Race Date</td><td>{meta.race_date}</td></tr>}
            {meta.availability && <tr><td style={metaLabelStyle}>Availability</td><td>{meta.availability.join(', ')}</td></tr>}
            {meta.long_run_day && <tr><td style={metaLabelStyle}>Long Run Day</td><td>{meta.long_run_day}</td></tr>}
            {meta.runs_per_week != null && <tr><td style={metaLabelStyle}>Runs/Week</td><td>{meta.runs_per_week}</td></tr>}
            {meta.template_id && <tr><td style={metaLabelStyle}>Template</td><td>{meta.template_id}</td></tr>}
            {meta.generated_at && <tr><td style={metaLabelStyle}>Generated</td><td>{new Date(meta.generated_at).toLocaleString()}</td></tr>}
          </tbody>
        </table>

        {weeks.map(week => (
          <div key={week.week_number} style={weekCardStyle}>
            <h4>Week {week.week_number}{week.theme ? ` — ${week.theme}` : ''}</h4>
            {week.week_notes && <p style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>{week.week_notes}</p>}
            {week.workouts.map((wo, idx) => (
              <div key={idx} style={workoutRowStyle}>
                <strong>{wo.day}</strong> — {wo.title}
                {wo.category && <span style={categoryTagStyle}>{wo.category}</span>}
              </div>
            ))}
          </div>
        ))}
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
        {generating ? 'generating...' : 'Generate My Training Plan'}
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
              {plan.created && <span>Created: {new Date(plan.created).toLocaleDateString()}</span>}
              {m.race_date && <span> &nbsp;|&nbsp; Race: {m.race_date}</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default MyTrainingPlans
