import { useState, useEffect } from 'react'
import Login from './views/login'
import Register from './views/register'
import Profile from './views/profile'
import CoachUI from './views/coach_ui'
import MyTrainingPlans from './views/training_plans'
import SharedTrainingPlan from './views/shared_training_plan'

function App() {
  const [pageTracking, setPageTracking] = useState('login')
  const [sessionData, setSessionData] = useState(null)

  function readToken() {
    return localStorage.getItem('jwt_token')
  }

  useEffect(() => {
    const token = readToken()
    if (!token) return

    fetch('/api/auth/session', {
      headers: { Authorization: 'Bearer ' + token }
    })
      .then(res => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then(data => {
        setSessionData(data)
        setPageTracking('dashboard')
      })
      .catch(() => {
        localStorage.removeItem('jwt_token')
      })
  }, [])

  const sharePath = window.location.pathname
  if (sharePath.startsWith('/share/')) {
    const slug = sharePath.replace('/share/', '')
    return <SharedTrainingPlan slug={slug} />
  }

  function signinHandler(token) {
    localStorage.setItem('jwt_token', token)
    fetch('/api/auth/session', {
      headers: { Authorization: 'Bearer ' + token }
    })
      .then(res => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then(data => {
        setSessionData(data)
        setPageTracking('dashboard')
      })
      .catch(() => {
        localStorage.removeItem('jwt_token')
      })
  }

  function signoutHandler() {
    localStorage.removeItem('jwt_token')
    setSessionData(null)
    setPageTracking('login')
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Svarnas Coaching App</h1>

      {pageTracking === 'login' && (
        <Login
          onLogin={signinHandler}
          switchToSignup={() => setPageTracking('register')}
        />
      )}

      {pageTracking === 'register' && (
        <Register switchToSignin={() => setPageTracking('login')} />
      )}

      {pageTracking === 'dashboard' && sessionData && (
        <div>
          <p>
            signed in as{' '}
            <strong>{sessionData.how_we_call_you || sessionData.email}</strong>
            {' '}({sessionData.role})
          </p>
          <button onClick={() => setPageTracking('profile')}>My profile</button>
          {' '}
          <button onClick={() => setPageTracking('myTrainingPlans')}>My Training Plans</button>
          {' '}
          {sessionData.role === 'coach' && (
            <>
              <button onClick={() => setPageTracking('coachDashboard')}>Coaching Dashboard</button>
              {' '}
            </>
          )}
          <button onClick={signoutHandler}>sign out</button>
        </div>
      )}

      {pageTracking === 'profile' && (
        <Profile
          token={readToken()}
          navigateBack={() => setPageTracking('dashboard')}
        />
      )}

      {pageTracking === 'myTrainingPlans' && (
        <MyTrainingPlans
          token={readToken()}
          navigateBack={() => setPageTracking('dashboard')}
        />
      )}

      {pageTracking === 'coachDashboard' && (
        <CoachUI
          token={readToken()}
          navigateBack={() => setPageTracking('dashboard')}
        />
      )}
    </div>
  )
}

export default App
