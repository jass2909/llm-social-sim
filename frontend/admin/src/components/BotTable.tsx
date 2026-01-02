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
  const [isOpen, setIsOpen] = useState(false)

  // Explanation Modal State
  const [explainModalOpen, setExplainModalOpen] = useState(false)
  const [selectedBot, setSelectedBot] = useState<string | null>(null)
  const [inputText, setInputText] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const loadBots = async () => {
    try {
      const res = await axios.get('http://localhost:8000/bots')
      setBots(res.data || [])
    } catch (e) {
      console.error("Failed to load bots", e)
    }
  }

  useEffect(() => { loadBots() }, [])

  const handleExplain = async () => {
    if (!inputText.trim() || !selectedBot) return
    setLoading(true)
    setResult(null)
    try {
      const res = await axios.post('http://localhost:8000/ml/explain_text', {
        bot: selectedBot,
        text: inputText
      })
      setResult(res.data)
    } catch (e) {
      console.error(e)
      alert("Failed to generate explanation")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 border rounded bg-white shadow-sm relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left focus:outline-none"
      >
        <h2 className="text-xl font-semibold text-gray-800">Configured Bots</h2>
        <svg 
          className={`w-6 h-6 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="mt-4 overflow-x-auto">
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
                    <div className="mt-2 text-xs">
                        <button 
                            className="bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200"
                            onClick={() => {
                                setSelectedBot(b.name)
                                setInputText("")
                                setResult(null)
                                setExplainModalOpen(true)
                            }}
                        >
                            Explain (LIME + CoT)
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Explanation Modal */}
      {explainModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-purple-50">
              <h3 className="text-lg font-bold text-purple-900">Explain Interaction: {selectedBot}</h3>
              <button onClick={() => setExplainModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Simulated Post Content</label>
                <textarea 
                  className="w-full border rounded p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  rows={3}
                  placeholder="Type a social media post here (e.g. 'I hate technology!')"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
              </div>

              {!loading && !result && (
                <button 
                  onClick={handleExplain}
                  disabled={!inputText.trim()}
                  className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed w-full font-semibold transition-colors"
                >
                  Analyze Decision
                </button>
              )}

              {loading && (
                <div className="flex flex-col items-center justify-center py-8 space-y-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
                  <span className="text-purple-600 font-medium animate-pulse">Running LIME Sampling & Bot Reasoning...</span>
                </div>
              )}

              {result && (
                <div className="space-y-6 animate-fade-in-up">
                  {/* CoT Section */}
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <h4 className="font-bold text-blue-900 mb-2 flex items-center">
                      <span className="text-xl mr-2">🤖</span> Bot's Chain of Thought
                    </h4>
                    <div className="grid grid-cols-[80px_1fr] gap-2 text-sm">
                      <span className="font-semibold text-gray-500">Decision:</span>
                      <span className="font-bold text-blue-800">{result.own_decision}</span>
                      
                      <span className="font-semibold text-gray-500">Reason:</span>
                      <span className="text-gray-800 italic">"{result.own_reason}"</span>
                    </div>
                  </div>

                  {/* LIME Section */}
                  <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                    <h4 className="font-bold text-green-900 mb-2 flex items-center">
                      <span className="text-xl mr-2">🍋</span> LIME Feature Importance
                    </h4>
                    <p className="text-xs text-gray-500 mb-3">
                        These values show how much each word contributed to the bot's decision.<br/>
                        <span className="text-green-700 font-bold">(+) Positive</span>: Word supports this decision. <br/>
                        <span className="text-red-700 font-bold">(-) Negative</span>: Word decreases confidence in this decision.
                    </p>
                    
                    <div className="flex flex-wrap gap-2">
                      {result.lime_explanation.map((item: any, idx: number) => {
                        const weight = item[1]
                        const isPositive = weight > 0
                        // Visual scaling
                        const opacity = Math.min(Math.abs(weight) * 5 + 0.1, 1) 
                        return (
                          <span 
                            key={idx} 
                            className={`px-2 py-1 rounded text-sm font-mono border ${
                              isPositive 
                                ? 'bg-green-100 text-green-800 border-green-200' 
                                : 'bg-red-100 text-red-800 border-red-200'
                            }`}
                            style={{ opacity: opacity < 0.3 ? 0.5 : 1 }}
                          >
                            {item[0]} <span className="opacity-60 text-xs">({weight.toFixed(2)})</span>
                          </span>
                        )
                      })}
                    </div>
                  </div>
                  
                  <button 
                    onClick={handleExplain}
                    className="w-full text-purple-600 text-sm hover:underline mt-2"
                  >
                    Re-analyze
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

