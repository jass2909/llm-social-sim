import { useEffect, useState } from 'react'
import axios from 'axios'
import Post from '../components/Post'

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
    <div className="w-full">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3">
        <h1 className="text-xl font-bold">Home</h1>
      </div>

      {/* Create Post Placeholder */}
      <div className="hidden sm:block border-b border-gray-200 p-4">
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-full bg-gray-300 flex-shrink-0" />
          <div className="w-full">
            <input
              type="text"
              placeholder="What is happening?!"
              className="w-full text-xl outline-none placeholder-gray-500 py-2"
            />
            <div className="flex justify-between items-center mt-4">
              <div className="flex gap-2 text-blue-500">
                {/* Icons for poll, media etc would go here */}
              </div>
              <button className="bg-blue-500 text-white font-bold px-4 py-1.5 rounded-full hover:bg-blue-600 disabled:opacity-50">
                Post
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="pb-20">
        {Array.isArray(posts) && posts.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <p>No posts loaded yet. Check backend connection.</p>
          </div>
        )}
        {Array.isArray(posts)
          ? posts.map((p, i) => (
            <Post
              key={i}
              bot={p.bot}
              text={p.text}
            />
          ))
          : <div className="p-4 text-red-500">Invalid posts data</div>}
      </div>
    </div>
  )
}
