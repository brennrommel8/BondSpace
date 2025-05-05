import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ThumbsUp } from 'lucide-react';
import { ReactionPopover } from '@/components/ui/reaction-popover';
import { ReactionType, User } from '@/api/postApi';

interface ReactionButtonProps {
  postId: string;
  commentId: string;
  replyId: string;
  currentUser: User | null;
  onReaction: (postId: string, commentId: string, replyId: string, type: ReactionType) => void;
  userReaction?: { type: ReactionType; user: User } | null;
  isReacting?: boolean;
  reactionCount?: number;
}

// Emoji map for reaction types
const reactionIcons: Record<ReactionType, string> = {
  like: "👍",
  love: "❤️",
  haha: "😂",
  wow: "😮",
  sad: "😢",
  angry: "😡"
};

// Style map for reaction types
const reactionStyles: Record<ReactionType, string> = {
  like: "bg-emerald-500 hover:bg-emerald-600 text-white",
  love: "bg-red-500 hover:bg-red-600 text-white", 
  haha: "bg-yellow-500 hover:bg-yellow-600 text-white",
  wow: "bg-yellow-400 hover:bg-yellow-500 text-white",
  sad: "bg-purple-500 hover:bg-purple-600 text-white",
  angry: "bg-orange-500 hover:bg-orange-600 text-white"
};

export const ReplyReactionButton: React.FC<ReactionButtonProps> = ({
  postId,
  commentId,
  replyId,
  onReaction,
  userReaction,
  isReacting,
  reactionCount = 0
}) => {
  const [showReactionPopover, setShowReactionPopover] = useState(false);
  
  // Handle direct like on button click
  const handleLike = () => {
    const defaultReaction: ReactionType = 'like';
    // Call the parent handler
    onReaction(postId, commentId, replyId, defaultReaction);
  };

  // Handle specific reaction selection
  const handleReaction = (type: ReactionType) => {
    console.log(`Selected reaction: ${type} for reply ${replyId}`);
    
    // Close the reaction popover before sending the request
    setShowReactionPopover(false);
    
    // Call the parent handler
    onReaction(postId, commentId, replyId, type);
  };

  // Get reaction icon to display
  const getReactionIcon = () => {
    if (!userReaction) return <ThumbsUp className="mr-1 h-3 w-3" />;
    
    // Handle case where the reaction type isn't in our icon mapping
    if (!reactionIcons[userReaction.type]) {
      console.warn(`Unknown reaction type: ${userReaction.type}`);
      return <ThumbsUp className="mr-1 h-3 w-3" />;
    }
    
    return <span className="mr-1 text-base">{reactionIcons[userReaction.type]}</span>;
  };

  // Get reaction text to display
  const getReactionText = () => {
    if (!userReaction) return "Like";
    return userReaction.type.charAt(0).toUpperCase() + userReaction.type.slice(1);
  };

  // Get button style
  const getButtonVariant = () => {
    if (!userReaction) return "ghost";
    return reactionStyles[userReaction.type] || "default";
  };

  // Build additional display text for reaction count
  const getReactionCountText = () => {
    if (reactionCount > 0) {
      return ` (${reactionCount})`;
    }
    return '';
  };

  return (
    <div className="relative">
      <Button
        size="sm"
        variant={userReaction ? "default" : "ghost"}
        className={`py-1 h-7 text-xs ${userReaction ? getButtonVariant() : "text-emerald-600 hover:bg-emerald-50"}`}
        onMouseEnter={() => setShowReactionPopover(true)}
        onClick={handleLike}
        disabled={isReacting}
      >
        {getReactionIcon()}
        <span className={`text-xs font-medium ${userReaction ? "text-white" : ""}`}>
          {getReactionText()}{getReactionCountText()}
        </span>
      </Button>
      
      <ReactionPopover 
        isOpen={showReactionPopover}
        onClose={() => setShowReactionPopover(false)}
        onReaction={handleReaction}
      />
    </div>
  );
}; 