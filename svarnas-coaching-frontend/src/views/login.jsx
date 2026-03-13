import { useState } from 'react'

function Login({ onLogin, switchToSignup }) {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState(null)

  async function signinSubmit(e) {
    e.preventDefault()
    setError(null)
    try {
      const res = await fetch('/api/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pass })
      })
      const body = await res.json()
      if (res.ok) {
        onLogin(body.jwt_token)
      } else {
        setError(body.error)
      }
    } catch {
      setError('generic fetch error')
    }
  }

  return (
    <form onSubmit={signinSubmit}>
      <h2>sign in</h2>
      <div>
        <input
          type="email"
          placeholder="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <input
          type="password"
          placeholder="password"
          value={pass}
          onChange={e => setPass(e.target.value)}
          required
        />
      </div>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      <button type="submit">sign in</button>
      <p>
        no account?{' '}
        <button type="button" onClick={switchToSignup}>
          sign up
        </button>
      </p>
    </form>
  )
}

export default Login
