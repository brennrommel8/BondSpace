import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ReactionType } from "@/api/postApi";

// Reaction icons with emojis
const reactionIcons: Record<ReactionType, string> = {
  like: "👍",
  love: "❤️",
  haha: "😂",
  wow: "😮",
  sad: "😢",
  angry: "😡"
};

// Reaction colors
const reactionColors: Record<ReactionType, string> = {
  like: "bg-blue-500",
  love: "bg-red-500",
  haha: "bg-yellow-500",
  wow: "bg-yellow-500",
  sad: "bg-purple-500",
  angry: "bg-orange-500"
};

interface ReactionPopoverProps {
  onReaction: (type: ReactionType) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function ReactionPopover({ onReaction, isOpen, onClose }: ReactionPopoverProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className="absolute -top-14 left-0 z-50 bg-white rounded-full p-1 shadow-lg flex items-center space-x-1"
          onMouseLeave={onClose}
        >
          {Object.entries(reactionIcons).map(([type, icon]) => (
            <motion.button
              key={type}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              className={`w-9 h-9 rounded-full flex items-center justify-center text-lg hover:${reactionColors[type as ReactionType]} transition-colors`}
              onClick={() => {
                onReaction(type as ReactionType);
                onClose();
              }}
              title={type.charAt(0).toUpperCase() + type.slice(1)}
            >
              {icon}
            </motion.button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
} 