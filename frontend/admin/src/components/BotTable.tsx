import { useEffect, useState } from 'react'
import axios from 'axios'

interface Bot {
  name: string
  model: string
  profile?: {
    age: number
    traits: string[]
    interests: string[]
    emotional_baseline: string
    language_style: string
  }
  political_stance?: {
    economic: number
    social: number
    authority: number
    opinion_intensity: string
  }
  belief_anchor?: string
  // Legacy support just in case
  persona?: string
}

export default function BotTable() {
  const [bots, setBots] = useState<Bot[]>([])
  const loadBots = async () => {
    try {
      const res = await axios.get('http://localhost:8000/bots')
      setBots(res.data || [])
    } catch (e) {
      console.error("Failed to load bots", e)
    }
  }

  useEffect(() => { loadBots() }, [])

  return (
    <div className="p-4 border rounded">
      <h2 className="text-xl font-semibold mb-3">Configured Bots</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full border text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="border px-3 py-2 text-left w-32">Name / Model</th>
              <th className="border px-3 py-2 text-left">Profile</th>
              <th className="border px-3 py-2 text-left w-48">Politics</th>
              <th className="border px-3 py-2 text-left">Belief Anchor</th>
            </tr>
          </thead>
          <tbody>
            {bots.map((b, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="border px-3 py-2 align-top">
                  <div className="font-bold text-base">{b.name}</div>
                  <div className="text-gray-500 text-xs">{b.model}</div>
                </td>
                
                <td className="border px-3 py-2 align-top">
                  {b.profile ? (
                    <div className="space-y-1">
                      <div><span className="font-semibold">Age:</span> {b.profile.age}</div>
                      <div>
                        <span className="font-semibold">Traits:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {b.profile.traits?.map((t, idx) => (
                            <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div><span className="font-semibold">Interests:</span> {b.profile.interests?.join(", ")}</div>
                      <div><span className="font-semibold">Style:</span> {b.profile.language_style}</div>
                    </div>
                  ) : (
                    <span className="text-gray-400 italic">No profile data</span>
                  )}
                </td>

                <td className="border px-3 py-2 align-top">
                  {b.political_stance ? (
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Econ:</span>
                        <span className={b.political_stance.economic < 0 ? "text-red-500" : "text-blue-500"}>
                          {b.political_stance.economic}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Social:</span> 
                        <span className={b.political_stance.social > 0 ? "text-green-600" : "text-purple-600"}>
                          {b.political_stance.social}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Auth:</span>
                        <span className={b.political_stance.authority > 0 ? "text-gray-800" : "text-orange-600"}>
                          {b.political_stance.authority}
                        </span>
                      </div>
                      <div className="mt-1 pt-1 border-t border-gray-100">
                        Intensity: <b>{b.political_stance.opinion_intensity}</b>
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>

                <td className="border px-3 py-2 align-top italic text-gray-700">
                  {b.belief_anchor || b.persona || <span className="text-gray-300">N/A</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
