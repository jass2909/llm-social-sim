import { useEffect, useState } from 'react'
import axios from 'axios'
import Post from '../components/Post'
import { useUser } from '../context/UserContext'

export default function Feed() {
  const [posts, setPosts] = useState([])
  const { user } = useUser()

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

  const [newPostText, setNewPostText] = useState("");

  const handleCreatePost = async () => {
    if (!newPostText.trim()) return;
    if (!user) return alert("Please login to post");

    try {
      await axios.post('http://localhost:8000/posts', {
        bot: user.name,
        text: newPostText
      });
      setNewPostText("");
      // Reload posts or optimistically add (reload is safer for IDs)
      const res = await axios.get('http://localhost:8000/posts');
      setPosts(res.data);
    } catch (err) {
      console.error("Failed to create post", err);
      alert("Failed to create post");
    }
  };

  return (
    <div className="w-full">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3">
        <h1 className="text-xl font-bold">Home</h1>
      </div>

      {/* Create Post Placeholder */}
      <div className="hidden sm:block border-b border-gray-200 p-4">
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
            {user?.name[0]?.toUpperCase() || "?"}
          </div>
          <div className="w-full">
            <input
              type="text"
              value={newPostText}
              onChange={(e) => setNewPostText(e.target.value)}
              placeholder="What is happening?!"
              className="w-full text-xl outline-none placeholder-gray-500 py-2"
            />
            <div className="flex justify-between items-center mt-4">
              <div className="flex gap-2 text-blue-500">
                {/* Icons for poll, media etc would go here */}
              </div>
              <button
                onClick={handleCreatePost}
                disabled={!newPostText.trim()}
                className="bg-blue-500 text-white font-bold px-4 py-1.5 rounded-full hover:bg-blue-600 disabled:opacity-50"
              >
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
              id={p.id}
              bot={p.bot}
              text={p.text}
              image={p.image}
              likes={p.likes}
              comments={p.comments}
              reactions={p.reactions}
              userReactions={p.user_reactions}
            />
          ))
          : <div className="p-4 text-red-500">Invalid posts data</div>}
      </div>
    </div>
  )
}
