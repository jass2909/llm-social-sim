import { useEffect, useState } from 'react'
import axios from 'axios'
import './index.css'

export default function Feed() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [rounds, setRounds] = useState(6)

  const runSimulation = async () => {
    setLoading(true)
    const res = await axios.post(`http://localhost:8000/simulate?rounds=${rounds}`)
    setPosts(res.data.conversation || [])
    setLoading(false)
  }

  useEffect(() => { runSimulation() }, [])

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">🤖 LLM Social Feed</h1>

      <div className="mb-4 flex items-center gap-2">
        <input type="number" value={rounds} onChange={e=>setRounds(e.target.value)} className="border p-1 w-24"/>
        <button onClick={runSimulation} className="bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-60" disabled={loading}>
          {loading ? 'Running…' : 'Run Simulation'}
        </button>
      </div>
    {posts.length === 0 && <p>No posts loaded yet</p>}
      {posts.map((p, i) => (
        <div key={i} className="p-4 mb-3 border rounded shadow">
          <b>{p.bot}</b>
          <p className="mt-2 whitespace-pre-wrap">{p.reply}</p>
        </div>
      ))}
    </div>
  )
}
