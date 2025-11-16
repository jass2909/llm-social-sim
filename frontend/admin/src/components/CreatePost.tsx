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
        { bot, text },
        { headers: { "Content-Type": "application/json" } }
      )
      setSuccess("✅ Post created successfully!")
      setBot("")
      setText("")
      if (onPostCreated) onPostCreated(res.data.post)
    } catch (err) {
      console.error(err)
      setError("❌ Failed to create post")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded-xl shadow mt-6">
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
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 rounded disabled:opacity-50"
        >
          {loading ? "Posting..." : "Post"}
        </button>
      </form>
      {error && <p className="text-red-500 mt-2">{error}</p>}
      {success && <p className="text-green-600 mt-2">{success}</p>}
    </div>
  )
}