import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ReactionType } from '@/api/postApi';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useReactions } from '@/hooks/useReactions';

interface ReactionUsersDialogProps {
  postId: string;
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

export function ReactionUsersDialog({ postId, isOpen, onClose }: ReactionUsersDialogProps) {
  const { isLoading, error, reactions, reactionsByType, totalCount, fetchReactions } = useReactions();
  const [activeReactionType, setActiveReactionType] = useState<ReactionType | "all">("all");
  const lastFetchedPostId = useRef<string | null>(null);
  const fetchingRef = useRef(false);

  useEffect(() => {
    if (isOpen && postId && !fetchingRef.current && lastFetchedPostId.current !== postId) {
      fetchingRef.current = true;
      lastFetchedPostId.current = postId;
      
      fetchReactions(postId).finally(() => {
        fetchingRef.current = false;
      });
    }
  }, [isOpen, postId, fetchReactions]);
  
  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setActiveReactionType("all");
    }
  }, [isOpen]);

  // Get all reaction types that have at least one reaction
  const availableReactionTypes = Object.keys(reactionsByType).filter(
    type => reactionsByType[type as ReactionType]?.length > 0
  ) as ReactionType[];

  // Get all reactions in a single array
  const allReactions = reactions.length > 0 ? reactions : Object.values(reactionsByType).flat();

  // Get the reactions to display based on active tab
  const displayedReactions = activeReactionType === "all" 
    ? allReactions 
    : reactionsByType[activeReactionType] || [];

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
          <DialogTitle>Post Reactions ({totalCount})</DialogTitle>
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
            <div className="flex mb-4 border-b">
              <button 
                onClick={() => setActiveReactionType("all")}
                className={`px-3 py-2 text-sm ${activeReactionType === "all" ? "border-b-2 border-primary font-semibold" : "text-gray-500"}`}
              >
                All ({totalCount})
              </button>
              
              {availableReactionTypes.slice(0, 3).map(type => (
                <button
                  key={type}
                  onClick={() => setActiveReactionType(type)}
                  className={`px-3 py-2 text-sm flex items-center ${activeReactionType === type ? "border-b-2 border-primary font-semibold" : "text-gray-500"}`}
                >
                  <span className="mr-1 text-lg">{ReactionEmojis[type]}</span>
                  <span className="ml-1">{type} ({reactionsByType[type]?.length || 0})</span>
                </button>
              ))}
            </div>

            {/* Scrollable content area */}
            <div className="h-[300px] pr-4 overflow-y-auto">
              <div className="space-y-3">
                {displayedReactions.map((reaction, index) => (
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
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${ReactionColors[reaction.type]}`}>
                      <span className="text-lg" role="img" aria-label={reaction.type}>
                        {ReactionEmojis[reaction.type]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 