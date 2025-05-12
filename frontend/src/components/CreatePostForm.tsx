import { useState, useRef } from 'react';
import { Send, Image, X, Smile } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from '@/api/postApi';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { toast } from 'sonner';

interface MediaFile {
  file: File;
  preview: string;
  type: 'image' | 'video';
}

interface CreatePostFormProps {
  currentUser: User | null;
  onSubmit: (content: string, mediaFiles: MediaFile[]) => void;
  isSubmitting: boolean;
}

export const CreatePostForm = ({ currentUser, onSubmit, isSubmitting }: CreatePostFormProps) => {
  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
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
    
    if (user.profilePicture && typeof user.profilePicture === 'object') {
      if ('url' in user.profilePicture && user.profilePicture.url) {
        return user.profilePicture.url;
      }
    }
    
    return user ? `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}` : '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim() || mediaFiles.length > 0) {
      onSubmit(content, mediaFiles);
      setContent('');
      setMediaFiles([]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Check if adding these files would exceed the limit
    if (mediaFiles.length + files.length > 6) {
      toast.error('You can only upload up to 5 images and 1 video');
      return;
    }

    // Check if there's already a video
    const hasVideo = mediaFiles.some(mf => mf.type === 'video');
    const newVideo = files.find(file => file.type.startsWith('video/'));
    
    if (hasVideo && newVideo) {
      toast.error('You can only upload one video per post');
      return;
    }

    files.forEach(file => {
      // Check file size (500MB limit)
      if (file.size > 500 * 1024 * 1024) {
        toast.error('File size must be less than 500MB');
        return;
      }
      
      // Accept both images and videos
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        toast.error('Please select an image or video file');
        return;
      }

      // Check if we already have 5 images and trying to add another image
      const imageCount = mediaFiles.filter(mf => mf.type === 'image').length;
      if (file.type.startsWith('image/') && imageCount >= 5) {
        toast.error('You can only upload up to 5 images');
        return;
      }

      // For videos, check duration and size
      if (file.type.startsWith('video/')) {
        // Create a video element to check duration
        const video = document.createElement('video');
        video.preload = 'metadata';
        
        video.onloadedmetadata = () => {
          // Check video duration (5 minutes limit)
          if (video.duration > 300) {
            toast.error('Video must be less than 5 minutes');
            return;
          }
          
          // Check video size (500MB limit)
          if (file.size > 500 * 1024 * 1024) {
            toast.error('Video size must be less than 500MB');
            return;
          }
          
          // Create preview
          const reader = new FileReader();
          reader.onloadend = () => {
            setMediaFiles(prev => [...prev, {
              file,
              preview: reader.result as string,
              type: 'video'
            }]);
          };
          reader.readAsDataURL(file);
        };
        
        video.onerror = () => {
          toast.error('Error loading video file');
        };
        
        video.src = URL.createObjectURL(file);
      } else {
        // For images, create preview directly
        const reader = new FileReader();
        reader.onloadend = () => {
          setMediaFiles(prev => [...prev, {
            file,
            preview: reader.result as string,
            type: 'image'
          }]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleRemoveMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
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
      
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + emoji.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 10);
    } else {
      setContent(prevContent => prevContent + emoji);
    }
    
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
              
              {/* Media preview grid */}
              {mediaFiles.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {mediaFiles.map((media, index) => (
                    <div key={index} className="relative rounded-md overflow-hidden">
                      {media.type === 'image' ? (
                        <img 
                          src={media.preview} 
                          alt={`Preview ${index + 1}`} 
                          className="w-full h-32 object-cover rounded-md" 
                        />
                      ) : (
                        <video 
                          src={media.preview}
                          className="w-full h-32 object-cover rounded-md"
                          controls
                          preload="metadata"
                        >
                          <source src={media.preview} type={media.file.type} />
                          Your browser does not support the video tag.
                        </video>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveMedia(index)}
                        className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
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
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="hidden"
              id="media-upload"
              multiple
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting || mediaFiles.length >= 6}
            >
              <Image className="h-4 w-4 mr-2" />
              Add Media
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
            disabled={(!content.trim() && mediaFiles.length === 0) || isSubmitting}
          >
            {isSubmitting ? 'Posting...' : 'Post'}
            <Send className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}; 