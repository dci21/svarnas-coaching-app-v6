import { useState, useEffect } from 'react'

function App() {
  const [msg, setMsg] = useState(null)
  const [pingData, setPingData] = useState(null)

  useEffect(() => {
    fetch('/api/ping')
      .then(async (res) => {
        const body = await res.json()
        if (res.ok) {
          setMsg('backend and db are up and running')
          setPingData(body)
        } else {
          setMsg('backend is running but connection to the db failed')
        }
      })
      .catch(() => {
        setMsg("backend cant be reached")
      })
  }, [])

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>svarnas coaching</h1>
      {msg && <p>{msg}</p>}
      {pingData && (
        <ul>
          <li>db: {pingData.db}</li>
          <li>latency: {pingData.latency}ms</li>
          <li>timestamp: {pingData.timestamp}</li>
        </ul>
      )}
    </div>
  )
}

export default App
