import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Image, Smile, MapPin, Tag, X, User } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { authApi } from '@/api/authApi'
import EmojiPicker from 'emoji-picker-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface CreatePostDialogProps {
  isOpen: boolean
  onClose: () => void
}

export const CreatePostDialog = ({ isOpen, onClose }: CreatePostDialogProps) => {
  const [content, setContent] = useState('')
  const [media, setMedia] = useState<File | null>(null)
  const [profilePicture, setProfilePicture] = useState<string | undefined>(undefined)
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await authApi.getMe()
        if (response.success && response.user?.profilePicture) {
          setProfilePicture(response.user.profilePicture)
        }
      } catch (error) {
        console.error("Error fetching profile:", error)
      }
    }

    fetchProfile()
  }, [])

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setMedia(file)
    }
  }

  const handleEmojiClick = (emojiObject: any) => {
    setContent(prevContent => prevContent + emojiObject.emoji)
    setIsEmojiPickerOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Post</DialogTitle>
        </DialogHeader>
        
        <div className="flex items-start space-x-3 py-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profilePicture} alt="Profile" />
            <AvatarFallback className="bg-emerald-50 text-emerald-600">
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <Textarea
              placeholder="What's on your mind?"
              className="min-h-[100px] resize-none border-0 focus-visible:ring-0"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            
            {media && (
              <div className="mt-2 relative max-h-[300px] overflow-hidden rounded-lg">
                <img
                  src={URL.createObjectURL(media)}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70"
                  onClick={() => setMedia(null)}
                >
                  <X className="h-4 w-4 text-white" />
                </Button>
              </div>
            )}
            
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Image className="h-5 w-5 text-emerald-600" />
                </Button>
                
                <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full"
                    >
                      <Smile className="h-5 w-5 text-emerald-600" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <EmojiPicker
                      onEmojiClick={handleEmojiClick}
                      width={300}
                      height={400}
                    />
                  </PopoverContent>
                </Popover>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                >
                  <MapPin className="h-5 w-5 text-emerald-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                >
                  <Tag className="h-5 w-5 text-emerald-600" />
                </Button>
              </div>
              
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={!content.trim() && !media}
              >
                Post
              </Button>
            </div>
          </div>
        </div>
        
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleMediaChange}
        />
      </DialogContent>
    </Dialog>
  )
} 