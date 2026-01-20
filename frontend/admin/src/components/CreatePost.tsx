import { useState, useEffect } from "react"
import axios from "axios"

interface CreatePostProps {
  onPostCreated?: (post: any) => void
}

export default function CreatePost({ onPostCreated }: CreatePostProps) {
  const [bot, setBot] = useState("")
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [bots, setBots] = useState<string[]>([])

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [selectedBotForGen, setSelectedBotForGen] = useState("")
  const [topic, setTopic] = useState("")
  const [generateImage, setGenerateImage] = useState(false)

  useEffect(() => {
    const fetchBots = async () => {
      try {
        const res = await axios.get("http://localhost:8000/bots")
        const data = res.data
        const botList = Array.isArray(data)
          ? data
          : Object.values(data)
        setBots(botList)
        console.log(botList)
      } catch (err) {
        console.error("Failed to fetch bots:", err)
      }
    }
    fetchBots()
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")
    try {
      const res = await axios.post(
        "http://localhost:8000/posts",
        { bot, text, generate_image: false },
        { headers: { "Content-Type": "application/json" } }
      )
      setSuccess("✅ Post created successfully!")
      setBot("")
      setText("")
      setGenerateImage(false)
      if (onPostCreated) onPostCreated(res.data.post)
    } catch (err) {
      console.error(err)
      setError("❌ Failed to create post")
    } finally {
      setLoading(false)
    }
  }

  // Opens the modal instead of generating immediately
  const handleAutoGenerateClick = () => {
    setError("")
    setSuccess("")
    setShowModal(true)
    setSelectedBotForGen("")
    setTopic("")
    setGenerateImage(false)
  }

  // The actual generation logic
  const confirmGenerate = async (specificBotName?: string) => {
    setShowModal(false) // Close modal immediately or wait? Better to close to show loading state.
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      let botNameToUse = specificBotName

      // 1. Pick a random bot if none specified
      if (!botNameToUse) {
        if (bots.length === 0) {
          setError("No bots available to generate posts.")
          setLoading(false)
          return
        }
        const randomBot = bots[Math.floor(Math.random() * bots.length)]
        // @ts-ignore
        botNameToUse = randomBot.name || "Clara"
      }

      // 2. Generate Content via ML
      // We send -1 to tell backend to use Real Database Stats
      const genRes = await axios.post(`http://localhost:8000/ml/generate?bot=${botNameToUse}`, {
        likes: -1,
        comments: -1,
        sentiment: 0.9,
        interaction: 0.8,
        topic: topic, // Pass the optional topic
        generate_image: generateImage
      })

      const { generated_content, bot: generatedBot, image: generatedImage } = genRes.data

      // 3. Publish the Post
      const postRes = await axios.post(
        "http://localhost:8000/posts",
        {
          bot: generatedBot,
          text: generated_content,
          image: generatedImage // Pass the already generated image URL if any
        },
        { headers: { "Content-Type": "application/json" } }
      )

      setSuccess(`✨ AI Created a post using strategy: ${genRes.data.strategy_used} (Bot: ${generatedBot})`)
      setBot("")
      setText("")
      if (onPostCreated) onPostCreated(postRes.data)

    } catch (err) {
      console.error(err)
      setError("❌ Failed to auto-generate post")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded-xl shadow mt-6 relative">
      <h2 className="text-xl font-semibold mb-3">Create a Post</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <select
          value={bot}
          onChange={(e) => setBot(e.target.value)}
          className="border p-2 rounded"
          required
        >
          <option value="">Select a bot</option>
          {bots.map((b: any, index) => (
            <option key={`${b.name}-${index}`} value={b.name}>
              {b.name} — {b.model}
            </option>
          ))}
        </select>
        <textarea
          placeholder="Write your post..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="border p-2 rounded min-h-[100px]"
          required
        />


        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded disabled:opacity-50"
          >
            {loading ? "Posting..." : "Post"}
          </button>
          <button
            type="button"
            onClick={handleAutoGenerateClick}
            disabled={loading}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? "Thinking..." : "✨ Auto-Generate & Post"}
          </button>
        </div>
      </form>
      {error && <p className="text-red-500 mt-2">{error}</p>}
      {success && <p className="text-green-600 mt-2">{success}</p>}

      {/* MODAL OVERLAY */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm animate-fade-in border border-gray-100">
            <h3 className="text-lg font-bold mb-4 text-center text-gray-800">Choose Generation Mode</h3>

            <div className="mb-4">
              <label className="text-sm font-medium text-gray-600 block mb-1">Topic (Optional):</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., The Future of AI, Best Coffee Spots..."
                className="w-full border p-2 rounded focus:ring-2 focus:ring-purple-200 outline-none text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">Leave empty to let the ML Agent decide.</p>
            </div>

            <div className="mb-4 flex items-center gap-2">
              <input
                type="checkbox"
                id="genImgModal"
                checked={generateImage}
                onChange={e => setGenerateImage(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="genImgModal" className="text-sm text-gray-700">Include AI Image</label>
            </div>

            <div className="flex flex-col gap-4">
              {/* Option 1: Random */}
              <button
                onClick={() => confirmGenerate()}
                className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-medium hover:from-purple-600 hover:to-indigo-700 transition shadow-md flex items-center justify-center gap-2"
              >
                🎲 Random Persona
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-gray-300"></div>
                <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">OR</span>
                <div className="flex-grow border-t border-gray-300"></div>
              </div>

              {/* Option 2: Specific */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-600">Select Specific Persona:</label>
                <select
                  value={selectedBotForGen}
                  onChange={(e) => setSelectedBotForGen(e.target.value)}
                  className="border p-2 rounded focus:ring-2 focus:ring-purple-200 outline-none"
                >
                  <option value="">-- Choose Bot --</option>
                  {bots.map((b: any, index) => (
                    <option key={`gen-${b.name}-${index}`} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => confirmGenerate(selectedBotForGen)}
                  disabled={!selectedBotForGen}
                  className="w-full py-2 px-4 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Generate with {selectedBotForGen || "..."}
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="mt-6 w-full text-center text-gray-500 hover:text-gray-700 text-sm underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}