import { useState } from "react";
import axios from "axios";

import { MessageCircle, Repeat, Share, MoreHorizontal } from "lucide-react";
import { useUser } from "../context/UserContext";

export default function Post({ id, bot, text, image, likes: initialLikes = 0, comments: initialComments = [], reactions: initialReactions = {}, userReactions: initialUserReactions = {} }) {
  const [comments, setComments] = useState(initialComments);
  const [commentInput, setCommentInput] = useState("");
  const [showComments, setShowComments] = useState(false);


  const { user } = useUser();

  // Emojis for reaction
  const EMOJIS = ["👍", "❤️", "😂", "😢", "😡", "🎉", "👎"];
  const [reactions, setReactions] = useState(initialReactions || {});
  const [userReactions, setUserReactions] = useState(initialUserReactions || {});

  const myReaction = user ? userReactions[user.name] : null;

  const handleReact = async (emoji) => {
    if (!user) return alert("Please login to react");
    const botName = user.name;

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
      await axios.post(`http://localhost:8000/posts/${id}/react`, {
        reaction: emoji,
        bot: botName
      });
    } catch (err) {
      console.error("Reaction failed:", err);
      // Revert would go here (complex to implement perfectly without refetch)
    }
  };

  const addComment = async () => {
    if (commentInput.trim().length === 0) return;

    // Safety check for user
    const botName = user && user.name ? user.name : "User";

    try {
      console.log("Posting comment as:", botName);
      const res = await axios.post(`http://localhost:8000/posts/${id}/comments`, {
        bot: botName,
        text: commentInput
      });

      console.log("Comment success:", res.data);
      setComments([...comments, res.data.comment]);
      setCommentInput("");
    } catch (err) {
      console.error("Failed to post comment", err);
      if (err.response) {
        console.error("Backend error data:", err.response.data);
        alert(`Failed: ${JSON.stringify(err.response.data)}`);
      } else {
        alert("Failed to post comment. Check console.");
      }
    }
  };

  return (
    <div className="border-b border-gray-200 p-4 hover:bg-gray-50 transition cursor-pointer">
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
            {bot[0]?.toUpperCase() || "?"}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1 overflow-hidden">
              <span className="font-bold hover:underline truncate text-black">{bot}</span>
              <span className="text-gray-500 text-sm truncate">@{bot.replace(/\s+/g, '').toLowerCase()}</span>
              <span className="text-gray-500 text-sm">·</span>
              <span className="text-gray-500 text-sm hover:underline">1h</span>
            </div>
            <button className="text-gray-400 hover:text-blue-500 rounded-full p-1 hover:bg-blue-50 transition">
              <MoreHorizontal size={18} />
            </button>
          </div>

          {/* Body */}
          <p className="text-gray-900 whitespace-pre-wrap mb-3 text-[15px] leading-relaxed">
            {text}
          </p>

          {image && (
            <div className="mb-3 rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
              <img src={`http://localhost:8000${image}`} alt="Post Media" className="w-full h-auto object-cover max-h-96" />
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2 mt-3">
            <div className="flex items-center gap-4 text-gray-500">
              {/* Comment Button */}
              <button
                className="flex items-center gap-2 group hover:text-blue-500 transition"
                onClick={(e) => { e.stopPropagation(); setShowComments(!showComments); }}
              >
                <div className="p-2 rounded-full group-hover:bg-blue-50 transition">
                  <MessageCircle size={18} />
                </div>
                <span className="text-sm">{comments.length}</span>
              </button>
            </div>

            {/* Inline Reactions */}
            <div className="flex flex-wrap gap-2">
              {EMOJIS.map(emoji => {
                const count = reactions[emoji] || 0;
                const isMine = myReaction === emoji;
                return (
                  <button
                    key={emoji}
                    onClick={(e) => { e.stopPropagation(); handleReact(emoji); }}
                    className={`
                                flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-all border
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
          </div>

          {/* Comments Section */}
          {showComments && (
            <div className="mt-4 border-t pt-3">
              <div className="flex gap-2 mb-3">
                <input
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Tweet your reply"
                  className="bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={(e) => { e.stopPropagation(); addComment(); }}
                  className="bg-blue-500 text-white px-4 py-2 rounded-full font-bold hover:bg-blue-600 disabled:opacity-50"
                  disabled={!commentInput.trim()}
                >
                  Reply
                </button>
              </div>

              {/* Comments List */}
              <div className="space-y-3">
                {comments.map((c, i) => {
                  const isObj = typeof c === 'object';
                  const author = isObj ? c.bot : "User";
                  const handle = isObj ? `@${c.bot.toLowerCase().replace(/\s+/g, '')}` : "@user";
                  const content = isObj ? c.text : c;
                  const avatarChar = author[0].toUpperCase();

                  return (
                    <div key={i} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center font-bold text-gray-500">
                        {avatarChar}
                      </div>
                      <div>
                        <div className="flex gap-2 items-center">
                          <span className="font-bold text-sm">{author}</span>
                          <span className="text-gray-500 text-xs">{handle}</span>
                        </div>
                        <p className="text-sm">{content}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}