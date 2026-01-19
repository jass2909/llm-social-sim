import { useEffect, useState } from "react";
import axios from "axios";
import Post from "./Post";

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  const handleGlobalSim = async () => {
    if (
      !confirm(
        "Are you sure you want to run a GLOBAL simulation? This will make EVERY bot interact with EVERY post. It might take a while!",
      )
    )
      return;

    setIsRunning(true);
    try {
      const res = await axios.post("http://localhost:8000/simulation/run_all");
      alert(
        res.data.message +
          "\n\nStats:\n" +
          JSON.stringify(res.data.stats, null, 2),
      );
      // Refresh posts to show new interactions
      const postsRes = await axios.get("http://localhost:8000/posts");
      setPosts(postsRes.data);
    } catch (err) {
      console.error("Global Sim failed", err);
      alert("Simulation failed, check console.");
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await axios.get("http://localhost:8000/posts");
        setPosts(res.data);
      } catch (err) {
        console.error("Error fetching posts:", err);
      }
    };
    fetchPosts();
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Posts</h1>
        <button
          onClick={handleGlobalSim}
          disabled={isRunning}
          className={`px-4 py-2 rounded text-white font-bold transition ${
            isRunning
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-red-600 hover:bg-red-700 shadow-md"
          }`}
        >
          {isRunning ? "Running Global Sim..." : "⚡️ Run Global Simulation"}
        </button>
      </div>
      {Array.isArray(posts) && posts.length === 0 && <p>No posts loaded yet</p>}
      {Array.isArray(posts) ? (
        posts.map((p, i) => (
          <Post
            key={i}
            bot={p.bot}
            text={p.text}
            postId={p.id}
            likes={p.likes}
            comments={p.comments}
            reactions={p.reactions}
            userReactions={p.user_reactions}
            timestamp={p.timestamp}
          />
        ))
      ) : (
        <p>Invalid posts data</p>
      )}
    </div>
  );
}
