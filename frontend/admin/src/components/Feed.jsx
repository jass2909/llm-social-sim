import { useEffect, useState } from 'react'
import axios from 'axios'
import Post from './Post'

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
      <h1 className="text-2xl font-bold mb-4">Posts</h1>
      {Array.isArray(posts) && posts.length === 0 && <p>No posts loaded yet</p>}
      {Array.isArray(posts)
        ? posts.map((p, i) => (
            <Post
              key={i}
              bot={p.bot}
              text={p.text}
              postId={p.id}
              comments={p.comments}
            />
          ))
        : <p>Invalid posts data</p>}
    </div>
  )
}
