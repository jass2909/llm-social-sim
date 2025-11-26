import { useState } from "react";
import { useEffect } from "react";
import axios from "axios";

function Comment({ bot, text, deleteComment }) {
  return (
    <div className="p-2 bg-gray-100 rounded mb-1">
      <b>{bot}:</b> {text}
      <div className="flex justify-end">
        <button
          className="bg-red-500 text-white px-2 py-1 rounded"
          onClick={deleteComment}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default function Post({ bot, text, postId, likes: initialLikes = 0, comments: initialComments = [], timestamp }) {
  const [likes, setLikes] = useState(initialLikes);
  const [comments, setComments] = useState(initialComments);
  const [commentInput, setCommentInput] = useState("");

  const [showReplyPopup, setShowReplyPopup] = useState(false);
  const [bots, setBots] = useState([]);
  const [selectedBot, setSelectedBot] = useState("");
  const [isReplying, setIsReplying] = useState(false);

  useEffect(() => {
    axios.get("http://localhost:8000/bots").then(res => {
      setBots(res.data);
    }).catch(err => console.error("Failed to load bots", err));
  }, []);


  const addLike = () => {
    setLikes(likes + 1);
  };

  const addComment = () => {
    if (commentInput.trim().length === 0) return;
    setComments([...comments, { bot: "You", text: commentInput }]);
    setCommentInput("");
  };

  const deleteComment = (index) => {
    axios.delete("http://localhost:8000/comments", {
      data: { postId, index }
    })
      .then(() => {
        setComments(comments.filter((_, i) => i !== index));
      })
      .catch(err => console.error("Failed to delete comment", err));
  };

  return (
    <div className="p-4 mb-3 border rounded shadow">

      {/* Post content */}
      <div className="flex justify-between items-center">
        <b>{bot}</b>
        {timestamp && (
          <span className="text-gray-500 text-sm">
            {new Date(timestamp).toLocaleString()}
          </span>
        )}
      </div>
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
        <button
          onClick={() => setShowReplyPopup(true)}
          className="bg-red-500 text-white px-3 py-1 rounded"
        >
          Reply as Bot
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
          <Comment key={i} bot={c.bot} text={c.text} deleteComment={() => deleteComment(i)} />
        ))}
      </div>

      {showReplyPopup && (
        <div className="fixed inset-0 z-50 bg-gray-900 bg-opacity-20 flex items-center justify-center">
          <div className="bg-white p-4 rounded shadow w-80">
            <h2 className="font-bold mb-2">Reply as Bot</h2>
            <p className="mb-3">Post: {text}</p>
            <p className="mb-3">Select a bot to reply as:</p>
            <select
              className="border p-2 w-full rounded mb-3"
              value={selectedBot}
              onChange={(e) => setSelectedBot(e.target.value)}
            >
              <option value="">Select a bot...</option>
              {bots.map((b, i) => (
                <option key={i} value={b.name}>{b.name}</option>
              ))}
            </select>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowReplyPopup(false)}
                className="px-3 py-1 bg-gray-300 rounded"
              >
                Cancel
              </button>

              <button
                disabled={!selectedBot || isReplying}
                className="px-3 py-1 bg-blue-600 text-white rounded flex items-center gap-2"
                onClick={() => {
                  setIsReplying(true);
                  axios.post("http://localhost:8000/reply", {
                    bot: selectedBot,
                    text,
                    postId,
                  })
                    .then(() => {
                      setShowReplyPopup(false);
                    })
                    .catch(err => console.error("Failed to reply", err))
                    .finally(() => setIsReplying(false));
                }}
              >
                {isReplying ? (
                  <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4"></span>
                ) : (
                  "Reply"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}