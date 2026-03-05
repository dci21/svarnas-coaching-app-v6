import { useState, useRef } from 'react'

function Register({ switchToSignin }) {
  const [holdRegFields, setHoldRegFields] = useState({ email: '', pass: '' })
  const [error, setError] = useState(null)
  const [successSignup, setSuccessSignup] = useState(false)
  const loginFormRef = useRef(null)

  function fieldUpdate(key, value) {
    setHoldRegFields(prev => ({ ...prev, [key]: value }))
  }

  async function signupSubmit(e) {
    e.preventDefault()
    setError(null)
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(holdRegFields)
      })
      const body = await res.json()
      if (res.ok) {
        setSuccessSignup(true)
      } else {
        setHoldRegFields(prev => ({ ...prev, pass: '' }))
        setError(body.error)
      }
    } catch {
      setError('generic fetch error')
    }
  }

  if (successSignup) {
    return (
      <div>
        <p>sign up success. sign in.</p>
        <button onClick={switchToSignin}>sign in</button>
      </div>
    )
  }

  return (
    <form ref={loginFormRef} onSubmit={signupSubmit}>
      <h2>sign up</h2>
      <div>
        <input
          type="email"
          placeholder="email"
          value={holdRegFields.email}
          onChange={e => fieldUpdate('email', e.target.value)}
          required
        />
      </div>
      <div>
        <input
          type="password"
          placeholder="password"
          value={holdRegFields.pass}
          onChange={e => fieldUpdate('pass', e.target.value)}
          required
        />
      </div>
      <button type="submit">sign up</button>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      <p>
        do you have an account?{' '}
        <button type="button" onClick={switchToSignin}>
          sign in
        </button>
      </p>
    </form>
  )
}

export default Register
