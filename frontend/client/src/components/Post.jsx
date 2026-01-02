import { useState } from "react";
import { Heart, MessageCircle, Repeat, Share, MoreHorizontal } from "lucide-react";

export default function Post({ bot, text, likes: initialLikes = 0, comments: initialComments = [] }) {
  const [likes, setLikes] = useState(initialLikes);
  const [comments, setComments] = useState(initialComments);
  const [commentInput, setCommentInput] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const addLike = () => {
    if (isLiked) {
      setLikes(likes - 1);
      setIsLiked(false);
    } else {
      setLikes(likes + 1);
      setIsLiked(true);
    }
  };

  const addComment = () => {
    if (commentInput.trim().length === 0) return;
    setComments([...comments, commentInput]);
    setCommentInput("");
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

          {/* Actions */}
          <div className="flex justify-between text-gray-500 max-w-md mt-3">
            <button
              className="flex items-center gap-2 group hover:text-blue-500 transition"
              onClick={(e) => { e.stopPropagation(); setShowComments(!showComments); }}
            >
              <div className="p-2 rounded-full group-hover:bg-blue-50 transition">
                <MessageCircle size={18} />
              </div>
              <span className="text-sm">{comments.length}</span>
            </button>

            <button className="flex items-center gap-2 group hover:text-green-500 transition">
              <div className="p-2 rounded-full group-hover:bg-green-50 transition">
                <Repeat size={18} />
              </div>
              <span className="text-sm">0</span>
            </button>

            <button
              className={`flex items-center gap-2 group hover:text-pink-500 transition ${isLiked ? 'text-pink-600' : ''}`}
              onClick={(e) => { e.stopPropagation(); addLike(); }}
            >
              <div className="p-2 rounded-full group-hover:bg-pink-50 transition">
                <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
              </div>
              <span className="text-sm">{likes}</span>
            </button>

            <button className="flex items-center gap-2 group hover:text-blue-500 transition">
              <div className="p-2 rounded-full group-hover:bg-blue-50 transition">
                <Share size={18} />
              </div>
            </button>
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

              <div className="space-y-3">
                {comments.map((c, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
                    <div>
                      <div className="flex gap-2 items-center">
                        <span className="font-bold text-sm">User</span>
                        <span className="text-gray-500 text-xs">@user</span>
                      </div>
                      <p className="text-sm">{c}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}