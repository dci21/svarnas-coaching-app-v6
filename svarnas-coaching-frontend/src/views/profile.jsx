import { useState, useEffect } from 'react'

const DAY_ENUMS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const DAY_LABELS = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' }

const contextColors = {
  private: '#8b0000',
  coach: '#1a5276',
  public: '#196f3d'
}

function ContexBadge({ context }) {
  return (
    <span style={{
      fontSize: '0.7rem',
      padding: '2px 6px',
      borderRadius: '3px',
      color: '#fff',
      backgroundColor: contextColors[context],
      marginLeft: '6px',
      verticalAlign: 'middle'
    }}>
      {context}
    </span>
  )
}

function Profile({ token, navigateBack }) {
  const [profileFields, setProfileFields] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [err, setErr] = useState(null)
  const [successSave, setSuccessSave] = useState(false)
  const [coaches, setCoaches] = useState([])
  const [selectedCoachId, setSelectedCoachId] = useState(null)
  const [loadedCoachId, setLoadedCoachId] = useState(null)

  useEffect(() => {
    fetch('/api/profile', {
      headers: { Authorization: 'Bearer ' + token }
    })
      .then(res => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then(data => {
        if (!data.availability) data.availability = []
        //slice to trim the time and keep only the date to much the db column
        if (data.race_date) data.race_date = data.race_date.slice(0, 10)
        setProfileFields(data)
      })
      .catch(() => setErr('generic fetch error'))

    fetch('/api/coach/list-coaches', {
      headers: { Authorization: 'Bearer ' + token }
    })
      .then(res => res.ok ? res.json() : [])
      .then(list => setCoaches(list))
      .catch(() => {})

    fetch('/api/coach/linked-coach', {
      headers: { Authorization: 'Bearer ' + token }
    })
      .then(res => res.ok ? res.json() : { coach: null })
      .then(data => {
        if (data.coach) {
          setSelectedCoachId(data.coach.user_id)
          setLoadedCoachId(data.coach.user_id)
        }
      })
      .catch(() => {})
  }, [token])

  function updateField(key, value) {
    setProfileFields(prev => ({ ...prev, [key]: value }))
  }

  function addRemoveDay(day) {
    setProfileFields(prev => {
      const current = prev.availability || []
      const removing = current.includes(day)
      const next = removing
        ? current.filter(d => d !== day)
        : [...current, day]
      const update = { ...prev, availability: next }
      if (removing && prev.long_run_day === day) update.long_run_day = null
      return update
    })
  }

  async function profileSave(e) {
    e.preventDefault()
    setSuccessMessage(null)
    setErr(null)
    setSuccessSave(true)
    try {
      const payload = {
        ...profileFields,
        runs_per_week: (profileFields.availability || []).length
      }
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token
        },
        body: JSON.stringify(payload)
      })
      const body = await res.json()
      if (res.ok) {
        if (!body.availability) body.availability = []
                //slice to trim the time and keep only the date to much the db column
        if (body.race_date) body.race_date = body.race_date.slice(0, 10)
        setProfileFields(body)
      } else {
        setErr(body.error)
        setSuccessSave(false)
        return
      }

      if (selectedCoachId !== loadedCoachId) {
        if (selectedCoachId) {
          await fetch('/api/coach/set-coach', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify({ coach_id: selectedCoachId })
          })
        } else {
          await fetch('/api/coach/remove-coach', {
            method: 'DELETE',
            headers: { Authorization: 'Bearer ' + token }
          })
        }
        setLoadedCoachId(selectedCoachId)
      }

      setSuccessMessage('Profile updated sucessfull')
    } catch {
      setErr('generic fetch error')
    }
    setSuccessSave(false)
  }

  if (!profileFields && !err) return <p>loading...</p>
  if (err && !profileFields) return <p style={{ color: 'crimson' }}>{err}</p>

  const fieldStyling = { marginBottom: '1rem' }
  const labelStyling = { display: 'block', marginBottom: '4px', fontWeight: 'bold' }
  const inputStyling = { padding: '4px 8px', width: '260px' }

  return (
    <div>
      <button type="button" onClick={navigateBack} style={{ marginBottom: '1rem' }}>
        &#8592;
      </button>
      <h2>My profile</h2>

      <form onSubmit={profileSave}>
        <div style={fieldStyling}>
          <label style={labelStyling}>
            First Name <ContexBadge context="private" />
          </label>
          <input
            style={inputStyling}
            value={profileFields.private_first_name || ''}
            onChange={e => updateField('private_first_name', e.target.value)}
          />
        </div>

        <div style={fieldStyling}>
          <label style={labelStyling}>
            Last Name <ContexBadge context="private" />
          </label>
          <input
            style={inputStyling}
            value={profileFields.private_last_name || ''}
            onChange={e => updateField('private_last_name', e.target.value)}
          />
        </div>

        <div style={fieldStyling}>
          <label style={labelStyling}>
            Username <ContexBadge context="coach" />
          </label>
          <input
            style={inputStyling}
            value={profileFields.how_we_call_you || ''}
            onChange={e => updateField('how_we_call_you', e.target.value)}
          />
        </div>

        <div style={fieldStyling}>
          <label style={labelStyling}>
            Public Name <ContexBadge context="public" />
          </label>
          <input
            style={inputStyling}
            value={profileFields.public_name || ''}
            onChange={e => updateField('public_name', e.target.value)}
          />
        </div>

        <div style={fieldStyling}>
          <label style={labelStyling}>
            Athlete Level <ContexBadge context="coach" />
          </label>
          <select
            style={inputStyling}
            value={profileFields.level || ''}
            onChange={e => updateField('level', e.target.value || null)}
          >
            <option value="">--</option>
            <option value="novice">novice</option>
            <option value="intermediate">intermediate</option>
            <option value="advanced">advanced</option>
          </select>
        </div>

        <div style={fieldStyling}>
          <label style={labelStyling}>
            Goal Distance <ContexBadge context="coach" />
          </label>
          <select
            style={inputStyling}
            value={profileFields.goal_distance || ''}
            onChange={e => updateField('goal_distance', e.target.value || null)}
          >
            <option value="">--</option>
            <option value="5k">5k</option>
            <option value="10k">10k</option>
            <option value="hm">half marathon</option>
            <option value="marathon">marathon</option>
          </select>
        </div>

        <div style={fieldStyling}>
          <label style={labelStyling}>
            Race Date <ContexBadge context="coach" />
          </label>
          <input
            type="date"
            style={inputStyling}
            value={profileFields.race_date || ''}
            onChange={e => updateField('race_date', e.target.value || null)}
          />
        </div>

        <div style={fieldStyling}>
          <label style={labelStyling}>
            Avaliable Days for Training <ContexBadge context="coach" />
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {DAY_ENUMS.map(day => (
              <label key={day} style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={(profileFields.availability || []).includes(day)}
                  onChange={() => addRemoveDay(day)}
                />
                {' '}{DAY_LABELS[day] || day}
              </label>
            ))}
          </div>
        </div>

        <div style={fieldStyling}>
          <label style={labelStyling}>
            Preferred Day for Longrun <ContexBadge context="coach" />
          </label>
          <select
            style={inputStyling}
            value={profileFields.long_run_day || ''}
            onChange={e => updateField('long_run_day', e.target.value || null)}
            disabled={!(profileFields.availability && profileFields.availability.length)}
          >
            <option value="">--</option>
            {DAY_ENUMS.filter(d => (profileFields.availability || []).includes(d)).map(day => (
              <option key={day} value={day}>{DAY_LABELS[day] || day}</option>
            ))}
          </select>
        </div>

        <div style={fieldStyling}>
          <label style={labelStyling}>
            Link a Coach to your account <ContexBadge context="coach" />
          </label>
          <select
            style={inputStyling}
            value={selectedCoachId || ''}
            onChange={e => setSelectedCoachId(e.target.value ? parseInt(e.target.value, 10) : null)}
          >
            <option value="">--</option>
            {coaches.map(c => (
              <option key={c.user_id} value={c.user_id}>
                {c.how_we_call_you || c.email}
              </option>
            ))}
          </select>
        </div>

        {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
        {err && <p style={{ color: 'crimson' }}>{err}</p>}

        <button type="submit" disabled={successSave}>Save</button>
      </form>
    </div>
  )
}

export default Profile
