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

export function ReactionDisplay({ reactions, showCount = true }: ReactionDisplayProps) {
  // Process reaction data
  const reactionData = React.useMemo(() => {
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

    return {
      hasReactions: true,
      reactionCounts,
      topReactions,
      totalReactions: reactions.length
    };
  }, [reactions]);

  if (!reactionData.hasReactions) {
    return null;
  }

  // Get reaction icon for a given type
  const getReactionIcon = (type: string | undefined): string => {
    if (!type) return "👍";
    return reactionIcons[type as ReactionType] || "👍";
  };

  // Build tooltip content
  const tooltipContent = () => {
    return Object.entries(reactionData.reactionCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => {
        const displayName = type in reactionNames 
          ? reactionNames[type as ReactionType] 
          : type;
        return `${getReactionIcon(type)} ${displayName}: ${count}`;
      })
      .join('\n');
  };

  return (
    <Tooltip content={<span className="whitespace-pre">{tooltipContent()}</span>}>
      <div className="inline-flex items-center gap-1">
        <div className="flex -space-x-1">
          {reactionData.topReactions.map((type) => (
            <span
              key={type}
              className="text-xs"
            >
              {getReactionIcon(type)}
            </span>
          ))}
        </div>
        {showCount && (
          <span className="text-xs text-gray-500">
            {reactionData.totalReactions}
          </span>
        )}
      </div>
    </Tooltip>
  );
} 