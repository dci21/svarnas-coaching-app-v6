import { useState, useEffect } from 'react'

function CoachUI({ token, navigateBack }) {
  const [linkedAthletes, setLinkedAthletes] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    async function loadAthletes() {
      try {
        const res = await fetch('/api/coach/linked-athletes', {
          headers: { Authorization: 'Bearer ' + token }
        })
        if (!res.ok) throw new Error()
        setLinkedAthletes(await res.json())
      } catch {
        setErr('generic fetch error')
      }
    }
    loadAthletes()
  }, [token])

  if (!linkedAthletes && !err) return <p>loading...</p>

  const cardStyle = {
    border: '1px solid #444',
    padding: '12px',
    marginBottom: '10px',
    borderRadius: '4px',
    background: '#2a2a3e'
  }

  return (
    <div>
      <button type="button" onClick={navigateBack} style={{ marginBottom: '1rem' }}>
        &#8592;
      </button>
      <h2>Coaching UI</h2>

      {err && <p style={{ color: 'crimson' }}>{err}</p>}

      <h3>My Athletes</h3>

      {linkedAthletes && linkedAthletes.length === 0 && (
        <p>You currently coaching 0 athletes</p>
      )}

      {linkedAthletes && linkedAthletes.map(ath => (
        <div key={ath.athlete_id} style={cardStyle}>
          <strong>{ath.how_we_call_you || 'unnamed'}</strong>
          <div style={{ marginTop: '6px', fontSize: '0.9rem' }}>
            {ath.level && <span>Level: {ath.level} &nbsp;</span>}
            {ath.goal_distance && <span>Goal: {ath.goal_distance} &nbsp;</span>}
            {ath.race_date && <span>Race: {ath.race_date.toString().slice(0, 10)} &nbsp;</span>}
          </div>
          {ath.availability && (
            <div style={{ marginTop: '4px', fontSize: '0.85rem' }}>
              Training days: {ath.availability.join(', ')}
              {ath.long_run_day && <span> (long run: {ath.long_run_day})</span>}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default CoachUI
