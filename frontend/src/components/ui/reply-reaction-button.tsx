import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ThumbsUp } from 'lucide-react';
import { ReactionPopover } from '@/components/ui/reaction-popover';
import { ReactionType, User } from '@/api/postApi';
import { useReplyReactions } from '@/hooks/useReplyReactions';

interface ReactionButtonProps {
  postId: string;
  commentId: string;
  replyId: string;
  userReaction?: { type: ReactionType; user: User } | null;
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

export const ReplyReactionButton: React.FC<ReactionButtonProps> = ({
  postId,
  commentId,
  replyId,
  userReaction: initialUserReaction,
  reactionCount: initialReactionCount = 0
}) => {
  const [showReactionPopover, setShowReactionPopover] = useState(false);
  
  // Use React Query hook for reply reactions
  const { 
    addReaction, 
    isAddingReaction,
    reactions,
    totalCount
  } = useReplyReactions(postId, commentId, replyId);
  
  // Get current user from localStorage
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  
  // Get current user's reaction from the hook data
  const userReaction = reactions.find(r => 
    r.user._id === currentUser._id || 
    r.user.id === currentUser._id
  ) || initialUserReaction;
  
  // Use total count from hook or fallback to initial count
  const reactionCount = totalCount || initialReactionCount;
  
  // Handle direct like on button click
  const handleLike = () => {
    const defaultReaction: ReactionType = 'like';
    addReaction(defaultReaction);
  };

  // Handle specific reaction selection
  const handleReaction = (type: ReactionType) => {
    console.log(`Selected reaction: ${type} for reply ${replyId}`);
    
    // Close the reaction popover before sending the request
    setShowReactionPopover(false);
    
    // Use React Query mutation
    addReaction(type);
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

  // Build additional display text for reaction count
  const getReactionCountText = () => {
    if (reactionCount > 0) {
      return ` (${reactionCount})`;
    }
    return '';
  };

  return (
    <div className="relative inline-flex">
      <Button
        size="sm"
        variant="ghost"
        className="px-2 py-1 h-auto min-h-0"
        onMouseEnter={() => setShowReactionPopover(true)}
        onClick={handleLike}
        disabled={isAddingReaction}
      >
        {getReactionIcon()}
        <span className="text-xs">{getReactionText()}{getReactionCountText()}</span>
      </Button>
      
      <ReactionPopover 
        isOpen={showReactionPopover}
        onClose={() => setShowReactionPopover(false)}
        onReaction={handleReaction}
      />
    </div>
  );
}; 