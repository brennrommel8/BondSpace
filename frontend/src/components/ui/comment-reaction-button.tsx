import { useState } from 'react';
import { Button } from './button';
import { ReactionPopover } from './reaction-popover';
import { ReactionDisplay } from './reaction-display';
import { ReactionType } from '@/types/post';
import { useCommentReactions } from '@/hooks/useCommentReactions';

interface CommentReactionButtonProps {
  postId: string;
  commentId: string;
  currentUserId?: string;
}

export function CommentReactionButton({ postId, commentId, currentUserId }: CommentReactionButtonProps) {
  const [showReactionPopover, setShowReactionPopover] = useState(false);
  const { reactions, totalCount, addReaction, isAddingReaction } = useCommentReactions(postId, commentId);

  const handleReaction = async (type: ReactionType) => {
    try {
      await addReaction(type);
      setShowReactionPopover(false);
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  const getCurrentUserReaction = () => {
    if (!currentUserId) return undefined;
    return reactions.find(reaction => 
      reaction.user._id === currentUserId || reaction.user.id === currentUserId
    );
  };

  const getReactionEmoji = (type: ReactionType) => {
    switch (type) {
      case 'like': return '👍';
      case 'love': return '❤️';
      case 'haha': return '😂';
      case 'wow': return '😮';
      case 'sad': return '😢';
      case 'angry': return '😡';
      default: return '👍';
    }
  };

  const getReactionLabel = (type: ReactionType) => {
    switch (type) {
      case 'like': return 'Like';
      case 'love': return 'Love';
      case 'haha': return 'Haha';
      case 'wow': return 'Wow';
      case 'sad': return 'Sad';
      case 'angry': return 'Angry';
      default: return 'Like';
    }
  };

  const currentReaction = getCurrentUserReaction();

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2 text-muted-foreground hover:text-foreground"
        onClick={() => setShowReactionPopover(!showReactionPopover)}
        disabled={isAddingReaction}
      >
        {currentReaction ? (
          <span className="flex items-center gap-1">
            <span>{getReactionEmoji(currentReaction.type)}</span>
            <span>{getReactionLabel(currentReaction.type)}</span>
          </span>
        ) : (
          <span>React</span>
        )}
      </Button>

      <ReactionPopover
        isOpen={showReactionPopover}
        onReaction={handleReaction}
        onClose={() => setShowReactionPopover(false)}
      />

      {totalCount > 0 && (
        <ReactionDisplay
          reactions={reactions}
          showCount={true}
        />
      )}
    </div>
  );
} 