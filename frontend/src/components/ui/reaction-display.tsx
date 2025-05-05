import * as React from "react";
import { Reaction, Post, ReactionType } from "@/api/postApi";
import { Tooltip } from "@/components/ui/tooltip";

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

interface ReactionDisplayProps {
  reactions?: Reaction[];
  post?: Post;
  showCount?: boolean;
}

export function ReactionDisplay({ reactions, post, showCount = true }: ReactionDisplayProps): React.JSX.Element {
  // If post is provided but no reactions, check if there are likes to show as fallback
  if ((!reactions || reactions.length === 0) && post?.likes && post.likes.length > 0) {
    // Create temporary like reactions from the likes array
    const likesAsReactions = post.likes.map(user => ({
      type: 'like' as const,
      user
    }));
    
    // Use these for display
    reactions = likesAsReactions;
  }
  
  // If still no reactions, return null
  if (!reactions || reactions.length === 0) {
    return null as any;
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

  // Build tooltip content - who reacted with what
  const tooltipContent = () => {
    // Group reactions by type
    const reactionsByType = Object.entries(reactionCounts)
      .sort((a, b) => b[1] - a[1]) // Sort by count (most popular first)
      .map(([type, count]) => {
        const reactionType = type as ReactionType;
        return `${reactionIcons[reactionType]} ${reactionNames[reactionType]}: ${count}`;
      })
      .join('\n');
    
    return reactionsByType;
  };

  return (
    <Tooltip content={<span className="whitespace-pre">{tooltipContent()}</span>}>
      <div className="flex items-center cursor-pointer">
        <div className="flex -space-x-1 mr-1">
          {topReactions.map((type) => (
            <div
              key={type}
              className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-xs shadow-sm"
            >
              {reactionIcons[type as keyof typeof reactionIcons]}
            </div>
          ))}
        </div>
        {showCount && (
          <span className="text-xs text-gray-500">
            {totalReactions}
          </span>
        )}
      </div>
    </Tooltip>
  );
} 