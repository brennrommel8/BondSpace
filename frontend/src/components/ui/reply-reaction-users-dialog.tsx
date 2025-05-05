import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ReactionType } from '@/api/postApi';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useReplyReactions } from '@/hooks/useReplyReactions';

interface ReplyReactionUsersDialogProps {
  postId: string;
  commentId: string;
  replyId: string;
  isOpen: boolean;
  onClose: () => void;
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

// Color classes for reaction types
const ReactionColors: Record<ReactionType, string> = {
  like: "bg-blue-100 text-blue-500",
  love: "bg-red-100 text-red-500",
  haha: "bg-yellow-100 text-yellow-600",
  wow: "bg-yellow-50 text-amber-500",
  sad: "bg-purple-100 text-purple-500",
  angry: "bg-orange-100 text-orange-500"
};

// Helper function to normalize reaction types
const normalizeReactionType = (type: string | undefined): ReactionType => {
  if (!type) return 'like';
  
  // Convert to lowercase for consistency
  const normalizedType = type.toLowerCase();
  
  // Handle known mappings - these should reflect actual backend data
  if (normalizedType === 'heart') return 'love';
  
  // Add direct mapping for numeric types if they exist
  // For example, if backend returns "1" for like, "2" for love, etc.
  if (normalizedType === '1') return 'like';
  if (normalizedType === '2') return 'love';
  if (normalizedType === '3') return 'haha';
  if (normalizedType === '4') return 'wow';
  if (normalizedType === '5') return 'sad';
  if (normalizedType === '6') return 'angry';
  
  // Check if it's a valid reaction type
  if (normalizedType in ReactionEmojis) {
    return normalizedType as ReactionType;
  }
  
  // Default fallback
  console.warn(`Unknown reaction type: ${type}, defaulting to like`);
  return 'like';
};

// Define the reaction interface to use in our normalized state
interface NormalizedReaction {
  user: any;
  type: ReactionType;
  _id?: string;
  id?: string;
  createdAt?: string;
}

export function ReplyReactionUsersDialog({ 
  postId, 
  commentId, 
  replyId, 
  isOpen, 
  onClose 
}: ReplyReactionUsersDialogProps) {
  const { 
    isLoading, 
    error, 
    reactions, 
    reactionsByType, 
    totalCount, 
    fetchReplyReactions 
  } = useReplyReactions();
  
  const [activeReactionType, setActiveReactionType] = useState<ReactionType | "all">("all");
  const lastFetchedIds = useRef<{ postId: string; commentId: string; replyId: string } | null>(null);
  const fetchingRef = useRef(false);
  const [normalizedReactions, setNormalizedReactions] = useState<NormalizedReaction[]>([]);
  const [normalizedReactionsByType, setNormalizedReactionsByType] = useState<Record<ReactionType, NormalizedReaction[]>>({} as Record<ReactionType, NormalizedReaction[]>);

  // Normalize reaction data when it changes
  useEffect(() => {
    if (reactions.length > 0 || Object.keys(reactionsByType).length > 0) {
      console.log('Raw reaction data:', { 
        reactions: reactions.map(r => ({ type: r.type, user: r.user.name })),
        reactionTypeValues: reactions.map(r => r.type),
        reactionsByTypeKeys: Object.keys(reactionsByType),
        totalCount,
      });
      
      // Normalize all reactions
      const normalized = (reactions.length > 0 ? reactions : Object.values(reactionsByType).flat())
        .map(reaction => ({
          ...reaction,
          type: normalizeReactionType(reaction.type)
        }));
      
      setNormalizedReactions(normalized);
      
      // Rebuild the byType grouping with normalized types
      const byType: Record<ReactionType, NormalizedReaction[]> = {} as Record<ReactionType, NormalizedReaction[]>;
      normalized.forEach(reaction => {
        const type = reaction.type;
        if (!byType[type]) {
          byType[type] = [];
        }
        byType[type].push(reaction);
      });
      
      setNormalizedReactionsByType(byType);
      
      console.log('Normalized reaction data:', { 
        normalizedTypeValues: normalized.map(r => r.type),
        availableNormalizedTypes: Object.keys(byType),
        beforeAfterMapping: reactions.map(r => ({ 
          before: r.type,
          after: normalizeReactionType(r.type)
        }))
      });
    }
  }, [reactions, reactionsByType, totalCount]);

  useEffect(() => {
    if (isOpen && postId && commentId && replyId && !fetchingRef.current && 
        (lastFetchedIds.current?.postId !== postId || 
         lastFetchedIds.current?.commentId !== commentId || 
         lastFetchedIds.current?.replyId !== replyId)) {
      
      fetchingRef.current = true;
      lastFetchedIds.current = { postId, commentId, replyId };
      
      console.log(`Opening reply reaction dialog for reply: ${replyId}, fetching reaction data...`);
      
      fetchReplyReactions(postId, commentId, replyId).finally(() => {
        fetchingRef.current = false;
      });
    }
  }, [isOpen, postId, commentId, replyId, fetchReplyReactions]);
  
  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setActiveReactionType("all");
    }
  }, [isOpen]);

  // Get all reaction types that have at least one reaction
  const availableReactionTypes = Object.keys(normalizedReactionsByType).filter(
    type => normalizedReactionsByType[type as ReactionType]?.length > 0
  ) as ReactionType[];

  // Get the reactions to display based on active tab
  const displayedReactions = activeReactionType === "all" 
    ? normalizedReactions 
    : normalizedReactionsByType[activeReactionType] || [];

  // Helper to get profile image URL
  const getProfileImageUrl = (profilePicture: any, username: string) => {
    if (!profilePicture) {
      // Default avatar if no profile picture
      return `https://api.dicebear.com/7.x/initials/svg?seed=${username || 'user'}`;
    }
    
    if (typeof profilePicture === 'string') {
      return profilePicture;
    }
    
    if (profilePicture.url) {
      return profilePicture.url;
    }
    
    return `https://api.dicebear.com/7.x/initials/svg?seed=${username || 'user'}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reply Reactions ({totalCount})</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-6 text-center">Loading reactions...</div>
        ) : error ? (
          <div className="py-6 text-center text-red-500">{error}</div>
        ) : totalCount === 0 ? (
          <div className="py-6 text-center">No reactions yet</div>
        ) : (
          <div>
            {/* Simple tab selector */}
            <div className="flex mb-4 border-b overflow-x-auto">
              <button 
                onClick={() => setActiveReactionType("all")}
                className={`px-3 py-2 text-sm ${activeReactionType === "all" ? "border-b-2 border-primary font-semibold" : "text-gray-500"}`}
              >
                All ({totalCount})
              </button>
              
              {availableReactionTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setActiveReactionType(type)}
                  className={`px-3 py-2 text-sm flex items-center ${activeReactionType === type ? "border-b-2 border-primary font-semibold" : "text-gray-500"}`}
                >
                  <span className="mr-1 text-lg">{ReactionEmojis[type]}</span>
                  <span className="ml-1 capitalize">{type} ({normalizedReactionsByType[type]?.length || 0})</span>
                </button>
              ))}
            </div>

            {/* Scrollable content area */}
            <div className="h-[300px] pr-4 overflow-y-auto">
              <div className="space-y-3">
                {displayedReactions.map((reaction, index) => {
                  // Ensure reaction type is a valid ReactionType
                  const reactionType: ReactionType = normalizeReactionType(reaction.type);
                  
                  return (
                    <div key={`reaction-${index}`} className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100">
                      <Avatar className="h-10 w-10 border-2 border-gray-100">
                        <AvatarImage 
                          src={getProfileImageUrl(reaction.user.profilePicture, reaction.user.username)} 
                          alt={reaction.user.name} 
                        />
                        <AvatarFallback>{reaction.user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{reaction.user.name}</p>
                        <p className="text-xs text-gray-500">@{reaction.user.username}</p>
                      </div>
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${ReactionColors[reactionType]}`}>
                        <span className="text-lg" role="img" aria-label={reactionType}>
                          {ReactionEmojis[reactionType]}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 capitalize">
                        {reactionType}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 