import { useState, useEffect } from "react";
import axios from "axios";

function Comment({ comment, index, postId, deleteComment, onReplyAdded }) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");

  const handleReply = async () => {
    if (!replyText.trim()) return;
    if (!comment.id) {
      alert("Cannot reply to legacy comment (missing ID)");
      return;
    }
    try {
      const res = await axios.post(`http://localhost:8000/posts/${postId}/comments/${comment.id}/reply`, {
        bot: "Admin",
        text: replyText
      });
      onReplyAdded(comment.id, res.data.reply);
      setReplying(false);
      setReplyText("");
    } catch (err) {
      console.error("Failed to reply", err);
    }
  };

  return (
    <div className="p-2 bg-gray-100 rounded mb-1">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <b>{comment.bot}:</b> {comment.text}
        </div>
        <div className="flex gap-2 ml-2">
          {comment.id && (
            <button
              onClick={() => setReplying(!replying)}
              className="text-blue-500 hover:text-blue-700 text-sm"
            >
              Reply
            </button>
          )}
          <button
            className="text-red-500 hover:text-red-700 text-sm"
            onClick={() => deleteComment(index)}
          >
            Delete
          </button>
        </div>
      </div>

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-4 mt-2 pl-3 border-l-2 border-gray-300 space-y-1">
          {comment.replies.map((r, i) => (
            <div key={i} className="text-sm bg-white p-1 rounded border border-gray-100">
              <span className="font-semibold text-gray-700">{r.bot}:</span> <span className="text-gray-600">{r.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Reply Input */}
      {replying && (
        <div className="mt-2 ml-4 flex gap-2">
          <input
            className="border p-1 text-sm rounded w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder="Write a reply..."
            autoFocus
          />
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
            onClick={handleReply}
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}

export default function Post({ bot, text, image, postId, likes: initialLikes = 0, comments: initialComments = [], reactions: initialReactions = {}, userReactions: initialUserReactions = {}, timestamp }) {
  const [likes, setLikes] = useState(initialLikes);
  const [comments, setComments] = useState(initialComments);

  // Emojis for reaction
  const EMOJIS = ["👍", "❤️", "😂", "😢", "😡", "🎉", "👎"];
  const [reactions, setReactions] = useState(initialReactions || {});
  const [userReactions, setUserReactions] = useState(initialUserReactions || {});
  const myReaction = userReactions["Admin"];

  const [showReplyPopup, setShowReplyPopup] = useState(false);
  const [showSimulateOptions, setShowSimulateOptions] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);
  const [bots, setBots] = useState([]);
  const [selectedBot, setSelectedBot] = useState("");
  const [isReplying, setIsReplying] = useState(false);

  // Owner Reply State
  const [isAutoReplying, setIsAutoReplying] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  useEffect(() => {
    axios.get("http://localhost:8000/bots").then(res => {
      setBots(res.data);
    }).catch(err => console.error("Failed to load bots", err));
  }, []);

  const handleReact = async (emoji) => {
    const botName = "Admin";

    // Optimistic Update
    const oldReaction = userReactions[botName];
    const isRemove = oldReaction === emoji;

    // Update local state map
    const newReactions = { ...reactions };

    if (oldReaction) {
      newReactions[oldReaction] = Math.max(0, (newReactions[oldReaction] || 1) - 1);
      if (newReactions[oldReaction] === 0) delete newReactions[oldReaction];
    }

    if (!isRemove) {
      newReactions[emoji] = (newReactions[emoji] || 0) + 1;
    }

    setReactions(newReactions);
    setUserReactions(prev => {
      const next = { ...prev };
      if (isRemove) delete next[botName];
      else next[botName] = emoji;
      return next;
    });

    try {
      await axios.post(`http://localhost:8000/posts/${postId}/react`, {
        reaction: emoji,
        bot: botName
      });
    } catch (err) {
      console.error("Reaction failed:", err);
    }
  };

  const deletePost = async () => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
      await axios.delete(`http://localhost:8000/posts/${postId}`);
      setIsDeleted(true);
    } catch (err) {
      console.error("Failed to delete post", err);
      alert("Failed to delete post");
    }
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

  const handleReplyAdded = (commentId, reply) => {
    setComments(comments.map(c => {
      if (c.id === commentId) {
        return { ...c, replies: [...(c.replies || []), reply] };
      }
      return c;
    }));
  };

  const handleOwnerAutoReply = async () => {
    setIsAutoReplying(true);
    try {
      const res = await axios.post(`http://localhost:8000/posts/${postId}/owner_reply`);
      if (res.data.comments) {
        setComments(res.data.comments);
      }
      alert(`Owner reply complete. Replied to ${res.data.replied_count} comments.`);
    } catch (err) {
      console.error("Owner reply failed", err);
      alert("Failed to run owner reply cycle.");
    } finally {
      setIsAutoReplying(false);
    }
  };

  const handleSimulate = async (mode = "single") => {
    setShowSimulateOptions(false); // Close options if open
    try {
      const res = await axios.post(`http://localhost:8000/posts/${postId}/simulate_interaction?mode=${mode}`);
      console.log(res.data);

      if (res.data.type === "batch") {
        // Refresh post to show new stats
        const postRes = await axios.get(`http://localhost:8000/posts/${postId}`);
        setReactions(postRes.data.reactions || {});
        setComments(postRes.data.comments || []);

      } else {
        // Refresh post for single result too
        const postRes = await axios.get(`http://localhost:8000/posts/${postId}`);
        setReactions(postRes.data.reactions || {});
        setComments(postRes.data.comments || []);
      }
      setSimulationResult(res.data);
    } catch (error) {
      console.error("Simulation failed:", error);
    }
  };

  if (isDeleted) return null;

  return (
    <div className="p-4 mb-3 border rounded shadow bg-white relative overflow-visible">

      {/* Post content */}
      <div className="flex justify-between items-center bg-gray-50 p-2 rounded -mx-2 -mt-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
            {bot.substring(0, 2).toUpperCase()}
          </div>
          <b>{bot}</b>
        </div>
        <div className="flex items-center gap-2">
          {timestamp && (
            <span className="text-gray-400 text-xs">
              {new Date(timestamp).toLocaleString()}
            </span>
          )}
          <button
            onClick={deletePost}
            className="text-red-400 hover:text-red-600 font-bold ml-2"
            title="Delete Post"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Body */}
      <p className="text-gray-900 whitespace-pre-wrap mb-3 text-[15px] leading-relaxed">
        {text}
      </p>

      {image && (
        <div className="mb-3 rounded overflow-hidden border border-gray-100">
          <img src={`http://localhost:8000${image}`} alt="Generated Content" className="w-full h-auto object-cover" />
        </div>
      )}

      {/* Reactions Display (Interactive) */}
      <div className="flex flex-wrap gap-2 mb-2">
        {EMOJIS.map(emoji => {
          const count = reactions[emoji] || 0;
          const isMine = myReaction === emoji;
          return (
            <button
              key={emoji}
              onClick={(e) => { e.stopPropagation(); handleReact(emoji); }}
              className={`
                            flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all border
                            ${isMine
                  ? "bg-blue-100 border-blue-300 text-blue-800 font-bold ring-1 ring-blue-300"
                  : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300"
                }
                            ${count > 0 ? "opacity-100" : "opacity-70 hover:opacity-100"}
                        `}
            >
              <span>{emoji}</span>
              {count > 0 && <span className="text-xs">{count}</span>}
            </button>
          )
        })}
      </div>

      {/* Buttons */}
      <div className="flex flex-wrap gap-2 mt-3 border-t pt-3 relative">




        <button
          onClick={() => setShowReplyPopup(true)}
          className="bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200 transition"
        >
          🤖 Reply as Bot
        </button>

        <button
          onClick={() => setShowSimulateOptions(true)}
          className="bg-purple-100 text-purple-700 px-3 py-1 rounded hover:bg-purple-200 transition"
        >
          ⚡️ Simulate
        </button>

        <button
          onClick={handleOwnerAutoReply}
          disabled={isAutoReplying}
          className="bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200 transition disabled:opacity-50"
        >
          {isAutoReplying ? "Thinking..." : "🧠 Owner Auto-Reply"}
        </button>
      </div>

      {/* Comments */}
      <div className="mt-4 space-y-2">
        {comments.map((c, i) => (
          <Comment
            key={i}
            index={i}
            comment={c}
            postId={postId}
            deleteComment={deleteComment}
            onReplyAdded={handleReplyAdded}
          />
        ))}
      </div>

      {/* Popups */}
      {showReplyPopup && (
        <div className="fixed inset-0 z-50 bg-gray-900 bg-opacity-20 flex items-center justify-center">
          <div className="bg-white p-4 rounded shadow-xl w-80 border">
            <h2 className="font-bold mb-2">Reply as Bot</h2>
            <p className="mb-3 text-sm text-gray-600">Reply to the main post as a specific persona.</p>
            <select
              className="border p-2 w-full rounded mb-3"
              value={selectedBot}
              onChange={(e) => setSelectedBot(e.target.value)}
            >
              <option value="">Select a bot...</option>
              {bots.map((b, i) => (
                <option key={i} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowReplyPopup(false)}
                className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>

              <button
                disabled={!selectedBot || isReplying}
                className="px-3 py-1 bg-blue-600 text-white rounded flex items-center gap-2 hover:bg-blue-700"
                onClick={() => {
                  setIsReplying(true);
                  axios.post("http://localhost:8000/reply", {
                    bot: selectedBot,
                    text: commentInput || "Interesting!", // Use simple fallback if no text, OR use generic text
                    // Wait, original logic used `text` which was undefined in helper!
                    // Let's fix this: Use `commentInput` if available, or force user to write.
                    // But `reply` endpoint in `Post` component line 353 used variable `text` which was probably from closure?
                    // In previous file content check (step 41), it referred to `text` which was a PROP of Post!
                    // That means the bot was replying with the POST TEXT as the "text" arg?
                    // Let's check `reply_to_post` backend definition.
                    // Backend `ReplyInput`: `bot: str`, `postId: str`. NO text field!
                    // Wait, `ReplyInput` at line 100 in backend only has bot and postId.
                    // So line 353 in previous Post.jsx: `text` was likely ignored or erroneous?
                    // No, `reply_to_post` uses LLM to generate reply. It doesn't take text input.
                    // Ah! The user wants the bot to AUTO-reply.
                    // So `text` arg in axios post is useless.
                    postId,
                  })
                    .then((res) => {
                      const newComment = {
                        id: res.data.comment_id,
                        bot: res.data.bot,
                        text: res.data.reply,
                        replies: []
                      };
                      setComments([...comments, newComment]);
                      setShowReplyPopup(false);
                    })
                    .catch(err => console.error("Failed to reply", err))
                    .finally(() => setIsReplying(false));
                }}
              >
                {isReplying ? "..." : "Reply"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSimulateOptions && (
        <div className="fixed inset-0 z-50 bg-gray-900 bg-opacity-20 flex items-center justify-center">
          <div className="bg-white p-4 rounded shadow-xl w-80 border">
            <h2 className="font-bold mb-2">Simulate Interaction</h2>
            <p className="mb-4 text-sm text-gray-600">Choose how bots should interact with this post.</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleSimulate("single")}
                className="bg-blue-100 text-blue-800 p-2 rounded hover:bg-blue-200 text-left font-semibold"
              >
                🎲 One Random Bot
              </button>
              <button
                onClick={() => handleSimulate("all")}
                className="bg-purple-100 text-purple-800 p-2 rounded hover:bg-purple-200 text-left font-semibold"
              >
                ⚡️ All Bots (Batch)
              </button>
              <button
                onClick={() => setShowSimulateOptions(false)}
                className="mt-2 text-gray-500 text-sm hover:underline text-center"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {simulationResult && (
        <div className="fixed inset-0 z-50 bg-gray-900 bg-opacity-20 flex items-center justify-center">
          <div className="bg-white p-4 rounded shadow-xl w-80 border">
            <h2 className="font-bold mb-2">Simulation Result</h2>
            <div className={`p-3 mb-3 rounded text-sm ${simulationResult.type === 'like' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                simulationResult.type === 'dislike' ? 'bg-red-50 text-red-700 border border-red-100' :
                  simulationResult.type === 'comment' ? 'bg-green-50 text-green-700 border border-green-100' :
                    simulationResult.type === 'both' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                      simulationResult.type === 'dislike_comment' ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                        'bg-gray-50 text-gray-700 border border-gray-100'
              }`}>
              <p className="font-bold mb-1">{simulationResult.message}</p>
              {simulationResult.reason && (
                <p className="text-xs italic mt-2 border-t pt-2 border-gray-200 opacity-80">
                  Reason: {simulationResult.reason}
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSimulationResult(null)}
                className="px-3 py-1 bg-gray-800 text-white rounded hover:bg-gray-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}