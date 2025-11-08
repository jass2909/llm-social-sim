import { useState } from 'react'
import axios from 'axios'
interface Log {
  bot: string
  reply: string
}

export default function SimulationControl() {
  const [rounds, setRounds] = useState(6)
  const [running, setRunning] = useState(false)
  const [logs, setLogs] = useState<Log[]>([])

  const startSim = async () => {
    setRunning(true)
    const res = await axios.post(`http://localhost:8000/simulate?rounds=${rounds}`)
    setLogs(res.data.conversation)
    setRunning(false)
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 space-y-6">
      <h1 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 bg-clip-text text-transparent select-none">
        🧠 Simulation Dashboard
      </h1>
      <div className="flex items-center space-x-4">
        <label htmlFor="rounds" className="text-gray-700 font-semibold">
          Rounds:
        </label>
        <input
          id="rounds"
          type="number"
          min={1}
          value={rounds}
          onChange={e => setRounds(Number(e.target.value))}
          className="w-20 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={startSim}
          disabled={running}
          className="ml-auto bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold px-5 py-2 rounded-md transition-colors duration-200 disabled:cursor-not-allowed"
        >
          {running ? 'Running…' : 'Run Simulation'}
        </button>
      </div>
      <div className="max-h-[60vh] overflow-y-auto space-y-3 px-2">
        {logs.map((log, i) => (
          <div
            key={i}
            className={`max-w-xl rounded-lg p-4 ${
              i % 2 === 0 ? 'bg-indigo-50 text-indigo-900' : 'bg-purple-50 text-purple-900'
            } shadow-sm`}
          >
            <div className="font-semibold mb-1">{log.bot}</div>
            <div className="whitespace-pre-wrap">{log.reply}</div>
          </div>
        ))}
      </div>
    </div>
  )
}