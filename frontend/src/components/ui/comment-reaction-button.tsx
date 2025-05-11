import { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { ThumbsUp } from "lucide-react";
import { ReactionType, Reaction } from '@/api/postApi';
import { useCommentReactions } from '@/hooks/useCommentReactions';
import { CommentReactionUsersDialog } from './comment-reaction-users-dialog';
import { ReactionPopover } from './reaction-popover';

interface CommentReactionButtonProps {
  postId: string;
  commentId: string;
  reactions?: Reaction[]; // Initial reactions data
  userReaction?: { type: ReactionType; user: any } | null;
  reactionCount?: number;
}

// Emoji characters for reaction types
const ReactionEmojis: Record<ReactionType, string> = {
  like: "👍",
  love: "❤️",
  haha: "😂",
  wow: "😮",
  sad: "😢",
  angry: "😡"
};

export function CommentReactionButton({ 
  postId,
  commentId,
  reactions: initialReactions,
  userReaction: initialUserReaction,
  reactionCount: initialReactionCount = 0
}: CommentReactionButtonProps) {
  const [showReactionPopover, setShowReactionPopover] = useState(false);
  const [showReactionDialog, setShowReactionDialog] = useState(false);
  
  // Use React Query hook for comment reactions
  const { 
    addReaction, 
    isAddingReaction,
    reactions,
    totalCount
  } = useCommentReactions(postId, commentId);
  
  // Get current user from localStorage
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  
  // Use hook data if available, otherwise fall back to initial reactions
  const currentReactions = reactions.length > 0 ? reactions : (initialReactions || []);

  // Process reaction data using memoization
  const reactionData = useMemo(() => {
    // If no reactions, return placeholder data
    if (!currentReactions || currentReactions.length === 0) {
      return {
        hasReactions: false,
        reactionCounts: {},
        topReactions: [],
        totalReactions: 0
      };
    }

    // Count reactions by type
    const reactionCounts = currentReactions.reduce<Record<string, number>>((counts, reaction) => {
      counts[reaction.type] = (counts[reaction.type] || 0) + 1;
      return counts;
    }, {});

    // Get the top 3 reaction types
    const topReactions = Object.entries(reactionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type]) => type);

    return {
      hasReactions: true,
      reactionCounts,
      topReactions,
      totalReactions: totalCount || initialReactionCount || currentReactions.length
    };
  }, [currentReactions, totalCount, initialReactionCount]);
  
  // Get current user's reaction from the hook data or initial data
  const userReaction = reactions.find(r => 
    r.user._id === currentUser._id || 
    r.user.id === currentUser._id
  ) || initialUserReaction;
  
  // Handle direct like on button click
  const handleLike = () => {
    const defaultReaction: ReactionType = 'like';
    addReaction(defaultReaction);
  };

  // Handle specific reaction selection
  const handleReaction = (type: ReactionType) => {
    console.log(`Selected reaction: ${type} for comment ${commentId}`);
    
    // Close the reaction popover before sending the request
    setShowReactionPopover(false);
    
    // Use React Query mutation
    addReaction(type);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Reactions Display */}
      {reactionData.hasReactions && (
        <div 
          className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded-full"
          onClick={() => setShowReactionDialog(true)}
        >
          <div className="flex -space-x-1">
            {reactionData.topReactions.map((type) => (
              <div 
                key={type}
                className="w-4 h-4 rounded-full bg-white flex items-center justify-center text-xs shadow-sm"
              >
                <span role="img" aria-label={type}>
                  {ReactionEmojis[type as ReactionType]}
                </span>
              </div>
            ))}
          </div>
          <span className="text-xs text-gray-500">{reactionData.totalReactions}</span>
        </div>
      )}

      {/* Reaction Button */}
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          className="px-2 py-1 h-auto min-h-0"
          onMouseEnter={() => setShowReactionPopover(true)}
          onClick={handleLike}
          disabled={isAddingReaction}
        >
          {userReaction ? (
            <>
              <span className="mr-1">{ReactionEmojis[userReaction.type]}</span>
              <span className="text-xs capitalize">{userReaction.type}</span>
            </>
          ) : (
            <>
              <ThumbsUp className="mr-1 h-3 w-3" />
              <span className="text-xs">Like</span>
            </>
          )}
        </Button>
        
        <ReactionPopover 
          isOpen={showReactionPopover}
          onClose={() => setShowReactionPopover(false)}
          onReaction={handleReaction}
        />
      </div>

      {/* Reaction Users Dialog */}
      <CommentReactionUsersDialog
        postId={postId}
        commentId={commentId}
        isOpen={showReactionDialog}
        onClose={() => setShowReactionDialog(false)}
      />
    </div>
  );
} 