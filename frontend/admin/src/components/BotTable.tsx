import { useEffect, useState } from 'react'
import axios from 'axios'

interface Bot {
  name: string
  model: string
  persona: string
}
export default function BotTable() {
  const [bots, setBots] = useState<Bot[]>([])
  const loadBots = async () => {
    const res = await axios.get('http://localhost:8000/bots')
    setBots(res.data || [])
  }

  useEffect(() => { loadBots() }, [])

  return (
    <div className="p-4 border rounded">
      <h2 className="text-xl font-semibold mb-3">Configured Bots</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-50">
              <th className="border px-3 py-2 text-left">Name</th>
              <th className="border px-3 py-2 text-left">Model</th>
              <th className="border px-3 py-2 text-left">Persona</th>
            </tr>
          </thead>
          <tbody>
            {bots.map((b, i) => (
              <tr key={i}>
                <td className="border px-3 py-2 font-medium">{b.name}</td>
                <td className="border px-3 py-2">{b.model}</td>
                <td className="border px-3 py-2 whitespace-pre-wrap">{b.persona}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
