import { useState } from 'react'
import axios from 'axios'

interface Log {
  bot: string
  reply: string
}

export default function LogsViewer() {
  const [logs, setLogs] = useState<Log[]>([])

  const refreshLogs = async () => {
    const res = await axios.get(`http://localhost:8000/logs`)
    setLogs(res.data.conversation)
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">🧠 Logs Viewer</h1>
      <div>
        <button onClick={refreshLogs} className="bg-blue-600 text-white px-4 py-1 rounded">
          Refresh
        </button>
      </div>
      <div className="max-h-[60vh] overflow-y-scroll space-y-2">
        {logs.map((log,i)=>(
          <div key={i} className="border rounded p-2">
            <b>{log.bot}</b>: {log.reply}
          </div>
        ))}
      </div>
    </div>
  )
}