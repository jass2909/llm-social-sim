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

export default function Post({ bot, text, postId, likes: initialLikes = 0, comments: initialComments = [], timestamp }) {
  const [likes, setLikes] = useState(initialLikes);
  const [comments, setComments] = useState(initialComments);
  const [commentInput, setCommentInput] = useState("");

  const [showReplyPopup, setShowReplyPopup] = useState(false);
  const [showSimulateOptions, setShowSimulateOptions] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);
  const [bots, setBots] = useState([]);
  const [selectedBot, setSelectedBot] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  
  // Owner Reply State
  const [isAutoReplying, setIsAutoReplying] = useState(false);

  useEffect(() => {
    axios.get("http://localhost:8000/bots").then(res => {
      setBots(res.data);
    }).catch(err => console.error("Failed to load bots", err));
  }, []);


  const addLike = () => {
    axios.post(`http://localhost:8000/posts/${postId}/like`)
        .then(() => setLikes(likes + 1))
        .catch(err => console.error("Like failed", err));
  };

  const addComment = () => {
    if (commentInput.trim().length === 0) return;
    // We can't easily generate ID on client that matches backend UUID format exactly unless we import library, 
    // but better to let backend handle it?
    // Wait, typical flow is POST -> return created object.
    // But currently existing code (in user task desc?) might not be calling API?
    // Let's check previous file content.
    // Previous 'addComment' was just: setComments([...comments, {bot: "You", text: commentInput}]);
    // It DID NOT call API?
    // Oh, the provided file content line 44: `addComment` only updated local state?
    // And `deleteComment` line 50 called API.
    // That's inconsistent. If `addComment` doesn't save, it will be lost.
    // I should fix that too, but let's stick to the requested task.
    // Actually, if I add a reply via API, I should probably also add the comment via API?
    // But for now, I'll stick to original logic for consistency unless it's broken.
    // Actually, `addComment` logic in previous file:
    /*
      const addComment = () => {
        if (commentInput.trim().length === 0) return;
        setComments([...comments, { bot: "You", text: commentInput }]);
        setCommentInput("");
      };
    */
    // This looks like a local-only demo or incomplete code.
    // I will NOT fix `addComment` to call API right now to avoid scope creep, 
    // BUT checking `Post.jsx` again, `deleteComment` calls API. `handleSimulate` calls API.
    // It's weird `addComment` doesn't.
    // I'll leave `addComment` as is for now, but `Comment` component replies WILL call API.
    setComments([...comments, { bot: "You", text: commentInput, replies: [] }]); // optimistically add? No ID though.
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
            // Update local state based on batch results
            let newLikes = 0;
            const newComments = [];
            res.data.results.forEach(r => {
                if (r.type === "like") newLikes++;
                else if (r.type === "comment") newComments.push({ id: r.comment_id, bot: r.bot, text: r.comment, replies: [] });
            });
            setLikes(likes + newLikes);
            setComments([...comments, ...newComments]);
        } else {
            // Single result
            if (res.data.type === "like") {
                setLikes(likes + 1);
            } else if (res.data.type === "comment") {
                const newComment = { id: res.data.comment_id, bot: res.data.bot, text: res.data.comment, replies: [] };
                setComments([...comments, newComment]);
            } else if (res.data.type === "both") {
                setLikes(likes + 1);
                const newComment = { id: res.data.comment_id, bot: res.data.bot, text: res.data.comment, replies: [] };
                setComments([...comments, newComment]);
            }
        }
        setSimulationResult(res.data);
    } catch (error) {
        console.error("Simulation failed:", error);
    }
  };

  return (
    <div className="p-4 mb-3 border rounded shadow bg-white">

      {/* Post content */}
      <div className="flex justify-between items-center bg-gray-50 p-2 rounded -mx-2 -mt-2 mb-2">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                {bot.substring(0,2).toUpperCase()}
            </div>
            <b>{bot}</b>
        </div>
        {timestamp && (
          <span className="text-gray-400 text-xs">
            {new Date(timestamp).toLocaleString()}
          </span>
        )}
      </div>
      <p className="mt-2 mb-4 whitespace-pre-wrap text-gray-800 text-lg leading-relaxed">{text}</p>

      {/* Buttons */}
      <div className="flex flex-wrap gap-2 mt-3 border-t pt-3">
        <button
          onClick={addLike}
          className="flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 transition"
        >
          👍 {likes}
        </button>

        <button
          onClick={addComment}
          className="bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200 transition"
        >
          💬 Comment
        </button>
        
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

      {/* Comment input */}
      <div className="mt-3">
        <input
          value={commentInput}
          onChange={(e) => setCommentInput(e.target.value)}
          placeholder="Write a comment..."
          className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-300 outline-none"
        />
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
                    text,
                    postId,
                  })
                    .then((res) => {
                      // Update comments
                      // Expecting message, bot, reply, comment_id
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
            <div className={`p-3 mb-3 rounded text-sm ${
                simulationResult.type === 'like' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                simulationResult.type === 'comment' ? 'bg-green-50 text-green-700 border border-green-100' :
                simulationResult.type === 'both' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
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