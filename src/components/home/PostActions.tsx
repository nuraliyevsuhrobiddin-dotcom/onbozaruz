import React from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Send, Bookmark, Eye } from 'lucide-react';

interface PostActionsProps {
  isLiked: boolean;
  isSaved: boolean;
  likesCount: number;
  commentsCount: number;
  viewsCount?: number;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onSave: () => void;
}

export const PostActions: React.FC<PostActionsProps> = ({
  isLiked,
  isSaved,
  likesCount,
  commentsCount,
  viewsCount = 1240,
  onLike,
  onComment,
  onShare,
  onSave,
}) => {
  return (
    <div className="pt-2 pb-1 space-y-2 select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 1.35 }}
            onClick={onLike}
            className="flex items-center gap-1.5 focus:outline-none"
          >
            <Heart
              className={`w-6 h-6 transition-all duration-200 ${
                isLiked
                  ? 'fill-[#E53935] text-[#E53935] scale-110'
                  : 'text-[#111827] stroke-[1.75] hover:text-[#E53935]'
              }`}
            />
            <span className="font-extrabold text-[13px] text-[#111827]">
              {likesCount.toLocaleString()}
            </span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 1.2 }}
            onClick={onComment}
            className="flex items-center gap-1.5 text-[#111827] hover:text-slate-600 transition-colors focus:outline-none"
          >
            <MessageCircle className="w-6 h-6 stroke-[1.75]" />
            <span className="font-extrabold text-[13px] text-[#111827]">
              {commentsCount}
            </span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 1.2 }}
            onClick={onShare}
            className="flex items-center gap-1 text-[#111827] hover:text-slate-600 transition-colors focus:outline-none"
          >
            <Send className="w-6 h-6 stroke-[1.75]" />
          </motion.button>
        </div>

        <div className="flex items-center gap-4">
          {/* Views count */}
          <div className="flex items-center gap-1 text-slate-400 text-[11px] font-bold">
            <Eye className="w-4 h-4 text-slate-400 stroke-[1.75]" />
            <span>{viewsCount.toLocaleString()}</span>
          </div>

          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 1.2 }}
            onClick={onSave}
            className="focus:outline-none"
          >
            <Bookmark
              className={`w-6 h-6 transition-all duration-200 ${
                isSaved
                  ? 'fill-[#E53935] text-[#E53935]'
                  : 'text-[#111827] stroke-[1.75] hover:text-[#E53935]'
              }`}
            />
          </motion.button>
        </div>
      </div>
    </div>
  );
};
