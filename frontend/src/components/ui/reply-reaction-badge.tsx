import * as React from "react";
import { useState, useMemo } from "react";
import { Reaction, ReactionType } from "@/api/postApi";
import { Tooltip } from "@/components/ui/tooltip";
import { ReplyReactionUsersDialog } from "./reply-reaction-users-dialog";

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

interface ReplyReactionBadgeProps {
  postId: string;
  commentId: string;
  replyId: string;
  reactions?: Reaction[]; // Reactions data to display
  showCount?: boolean;
}

export function ReplyReactionBadge({ 
  postId, 
  commentId, 
  replyId, 
  reactions,
  showCount = true
}: ReplyReactionBadgeProps): React.JSX.Element | null {
  const [showDialog, setShowDialog] = useState(false);
  
  // Process reaction data using memoization
  const reactionData = useMemo(() => {
    // If no reactions, return placeholder data
    if (!reactions || reactions.length === 0) {
      return {
        hasReactions: false,
        reactionCounts: {},
        topReactions: [],
        totalReactions: 0
      };
    }

    // Count reactions by type
    const reactionCounts = reactions.reduce<Record<string, number>>((counts, reaction) => {
      counts[reaction.type] = (counts[reaction.type] || 0) + 1;
      return counts;
    }, {});

    // Get the top 3 reaction types
    const topReactions = Object.entries(reactionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type]) => type);

    // Get total reaction count
    const totalReactions = reactions.length;

    return {
      hasReactions: true,
      reactionCounts,
      topReactions,
      totalReactions
    };
  }, [reactions]);

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
      <ReplyReactionUsersDialog
        postId={postId}
        commentId={commentId}
        replyId={replyId}
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
      />
    </>
  );
} 