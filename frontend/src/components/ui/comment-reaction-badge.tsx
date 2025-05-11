import * as React from "react";
import { useState, useMemo } from "react";
import { Reaction, ReactionType } from "@/api/postApi";
import { Tooltip } from "@/components/ui/tooltip";
import { CommentReactionUsersDialog } from "./comment-reaction-users-dialog";
import { useCommentReactions } from "@/hooks/useCommentReactions";

// Reaction icons with emojis
const reactionIcons: Record<ReactionType, string> = {
  like: "👍",
  love: "❤️",
  haha: "😂",
  wow: "😮",
  sad: "😢",
  angry: "😡"
};

// Reaction display names
const reactionNames: Record<ReactionType, string> = {
  like: "Like",
  love: "Love",
  haha: "Haha",
  wow: "Wow",
  sad: "Sad",
  angry: "Angry"
};

interface CommentReactionBadgeProps {
  postId: string;
  commentId: string;
  reactions?: Reaction[]; // Initial reactions data
  showCount?: boolean;
}

export function CommentReactionBadge({ 
  postId, 
  commentId, 
  reactions: initialReactions,
  showCount = true
}: CommentReactionBadgeProps): React.JSX.Element | null {
  const [showDialog, setShowDialog] = useState(false);
  
  // Use React Query hook for real-time reaction updates
  const { reactions, totalCount } = useCommentReactions(postId, commentId);
  
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

    // Get total reaction count
    const totalReactions = totalCount || currentReactions.length;

    return {
      hasReactions: true,
      reactionCounts,
      topReactions,
      totalReactions
    };
  }, [currentReactions, totalCount]);

  // If no reactions after all hooks are executed, return null
  if (!reactionData.hasReactions) {
    return null;
  }
  
  // Get reaction icon for a given type
  const getReactionIcon = (type: string | undefined): string => {
    // Handle undefined or empty type
    if (!type) {
      return "👍"; // Default to like emoji
    }
    
    // Check if it's a valid type in our emoji map
    if (type in reactionIcons) {
      return reactionIcons[type as ReactionType];
    }
    
    // Fallback for unknown types
    return "👍";
  };

  // Build tooltip content - who reacted with what
  const tooltipContent = () => {
    // Group reactions by type
    const reactionsByType = Object.entries(reactionData.reactionCounts)
      .sort((a, b) => b[1] - a[1]) // Sort by count (most popular first)
      .map(([type, count]) => {
        const displayName = type && type in reactionNames 
          ? reactionNames[type as ReactionType] 
          : (type || 'Like');
        return `${getReactionIcon(type)} ${displayName}: ${count}`;
      })
      .join('\n');
    
    return reactionsByType;
  };

  const handleBadgeClick = () => {
    setShowDialog(true);
  };

  return (
    <>
      <Tooltip content={<span className="whitespace-pre">{tooltipContent()}</span>}>
        <div className="flex items-center cursor-pointer" onClick={handleBadgeClick}>
          <div className="flex -space-x-1 mr-1">
            {reactionData.topReactions.map((type) => (
              <div
                key={type}
                className="w-4 h-4 rounded-full bg-white flex items-center justify-center text-xs shadow-sm"
              >
                {getReactionIcon(type)}
              </div>
            ))}
          </div>
          {showCount && (
            <span className="text-xs text-gray-500">
              {reactionData.totalReactions}
            </span>
          )}
        </div>
      </Tooltip>
      
      {/* Dialog to show reaction users */}
      <CommentReactionUsersDialog
        postId={postId}
        commentId={commentId}
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
      />
    </>
  );
} 