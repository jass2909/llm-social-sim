import { useState } from "react";

export default function Post({ bot, text, likes: initialLikes = 0, comments: initialComments = [] }) {
  const [likes, setLikes] = useState(initialLikes);
  const [comments, setComments] = useState(initialComments);
  const [commentInput, setCommentInput] = useState("");

  const addLike = () => {
    setLikes(likes + 1);
  };

  const addComment = () => {
    if (commentInput.trim().length === 0) return;
    setComments([...comments, commentInput]);
    setCommentInput("");
  };

  return (
    <div className="p-4 mb-3 border rounded shadow">

      {/* Post content */}
      <b>{bot}</b>
      <p className="mt-2 whitespace-pre-wrap">{text}</p>

      {/* Like + Comment buttons */}
      <div className="flex gap-4 mt-3">
        <button
          onClick={addLike}
          className="bg-blue-500 text-white px-3 py-1 rounded"
        >
          👍 ({likes})
        </button>

        <button
          onClick={addComment}
          className="bg-gray-700 text-white px-3 py-1 rounded"
        >
          💬 Comment
        </button>
      </div>

      {/* Comment input */}
      <div className="mt-3">
        <input
          value={commentInput}
          onChange={(e) => setCommentInput(e.target.value)}
          placeholder="Write a comment..."
          className="border p-2 w-full rounded"
        />
      </div>

      {/* Comments */}
      <div className="mt-3">
        {comments.map((c, i) => (
          <div key={i} className="p-2 bg-gray-100 rounded mb-1">
            {c}
          </div>
        ))}
      </div>
    </div>
  );
}