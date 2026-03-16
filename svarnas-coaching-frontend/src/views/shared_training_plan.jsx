import { useState, useEffect } from 'react'

function SharedTrainingPlan({ slug }) {
  const [planData, setPlanData] = useState(null)
  const [err, setErr] = useState(null)

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
      <h2>Your Shared Training Plans</h2>
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
      <h2>Your Shared Training Plans</h2>

      <p style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>
        Training plan of <strong>{planData.public_name || 'Anonymous'}</strong>
      </p>

      <div style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
        {meta.distance && <span>Distance: {meta.distance} &nbsp;|&nbsp; </span>}
        {meta.level && <span>Level: {meta.level} &nbsp;|&nbsp; </span>}
        {meta.race_date && <span>Race: {meta.race_date}</span>}
      </div>

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

export default SharedTrainingPlan
