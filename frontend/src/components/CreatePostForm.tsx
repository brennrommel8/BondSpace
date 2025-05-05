import { useState, useRef } from 'react';
import { Send, Image, X, Smile } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from '@/api/postApi';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

interface CreatePostFormProps {
  currentUser: User | null;
  onSubmit: (content: string, mediaFile?: File) => void;
  isSubmitting: boolean;
}

export const CreatePostForm = ({ currentUser, onSubmit, isSubmitting }: CreatePostFormProps) => {
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Helper function to get profile picture URL
  const getProfilePictureUrl = (user: User | null) => {
    if (!user || !user.profilePicture) {
      return user ? `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}` : '';
    }
    
    if (typeof user.profilePicture === 'string') {
      return user.profilePicture;
    }
    
    // Handle object format
    if (user.profilePicture && typeof user.profilePicture === 'object') {
      if ('url' in user.profilePicture && user.profilePicture.url) {
        return user.profilePicture.url;
      }
    }
    
    // Default fallback
    return user ? `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}` : '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onSubmit(content, mediaFile || undefined);
      setContent('');
      setMediaFile(null);
      setMediaPreview(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Only accept images
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Create a preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      setMediaFile(file);
    }
  };

  const handleRemoveMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    // Insert emoji at current cursor position or at the end
    const emoji = emojiData.emoji;
    const textarea = textareaRef.current;
    
    if (textarea) {
      const start = textarea.selectionStart || 0;
      const end = textarea.selectionEnd || 0;
      
      const newContent = 
        content.substring(0, start) + 
        emoji + 
        content.substring(end);
      
      setContent(newContent);
      
      // Focus back on textarea and set cursor position after the inserted emoji
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + emoji.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 10);
    } else {
      // If no ref, just append to the end
      setContent(prevContent => prevContent + emoji);
    }
    
    // Close emoji picker after selection
    setShowEmojiPicker(false);
  };

  if (!currentUser) return null;

  return (
    <Card className="mb-6 shadow-sm">
      <form onSubmit={handleSubmit}>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Avatar>
              <AvatarImage
                src={getProfilePictureUrl(currentUser)}
                alt={currentUser.name}
              />
              <AvatarFallback>
                {currentUser.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                placeholder="What's on your mind?"
                className="resize-none focus-visible:ring-emerald-500"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
              />
              
              {/* Media preview */}
              {mediaPreview && (
                <div className="relative mt-3 rounded-md overflow-hidden">
                  <img 
                    src={mediaPreview} 
                    alt="Preview" 
                    className="w-full h-auto object-cover rounded-md max-h-[300px]" 
                  />
                  <button
                    type="button"
                    onClick={handleRemoveMedia}
                    className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Emoji Picker */}
              {showEmojiPicker && (
                <div className="absolute z-10 mt-2">
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    width={300}
                    height={400}
                    searchDisabled={false}
                    skinTonesDisabled
                    previewConfig={{ showPreview: false }}
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-3">
          <div className="flex items-center space-x-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id="media-upload"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting}
            >
              <Image className="h-4 w-4 mr-2" />
              Add Image
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              disabled={isSubmitting}
            >
              <Smile className="h-4 w-4 mr-2" />
              Add Emoji
            </Button>
          </div>
          <Button
            type="submit"
            className="bg-emerald-500 hover:bg-emerald-600"
            disabled={!content.trim() || isSubmitting}
          >
            {isSubmitting ? 'Posting...' : 'Post'}
            <Send className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}; 