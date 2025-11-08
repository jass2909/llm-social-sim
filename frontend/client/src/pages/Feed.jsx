import { useEffect, useState } from 'react'
import axios from 'axios'

export default function Feed() {
  const [posts, setPosts] = useState([])

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await axios.get('http://localhost:8000/posts')
        setPosts(res.data)
      } catch (err) {
        console.error('Error fetching posts:', err)
      }
    }
    fetchPosts()
  }, [])

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">🤖 LLM Social Feed</h1>
      {Array.isArray(posts) && posts.length === 0 && <p>No posts loaded yet</p>}
      {Array.isArray(posts)
        ? posts.map((p, i) => (
            <div key={i} className="p-4 mb-3 border rounded shadow">
              <b>{p.bot}</b>
              <p className="mt-2 whitespace-pre-wrap">{p.reply}</p>
            </div>
          ))
        : <p>Invalid posts data</p>}
    </div>
  )
}
