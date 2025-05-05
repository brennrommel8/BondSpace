import { useEffect, useState } from "react"
import { authApi, UserProfile } from "@/api/authApi"
import { profileApi } from "@/api/profileApi"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { User, Mail, Shield, Upload } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import axios from "axios"
import { Switch } from "@/components/ui/switch"

const Profile = () => {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  // Initialize with localStorage fallback, but will prioritize DB value when loaded
  const [postVisibility, setPostVisibility] = useState<"public" | "friends">(() => {
    const savedVisibility = localStorage.getItem('postVisibility')
    return (savedVisibility === 'public' || savedVisibility === 'friends') 
      ? savedVisibility 
      : "friends"
  })
  const [switchLoading, setSwitchLoading] = useState(false)
  const navigate = useNavigate()
  
  // Save to localStorage as fallback whenever visibility changes
  useEffect(() => {
    if (postVisibility) {
      localStorage.setItem('postVisibility', postVisibility)
    }
  }, [postVisibility])

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        console.log('Fetching user profile...')
        const response = await authApi.getMe()
        console.log('Profile API response:', response)
        
        if (response.success && response.user) {
          console.log('Full user object:', response.user)
          setUser(response.user)
          
          // Set visibility directly from user profile if available
          if (response.user.postVisibility) {
            console.log('Found postVisibility in user profile:', response.user.postVisibility)
            setPostVisibility(response.user.postVisibility)
          } else {
            console.log('postVisibility not found in user profile, using localStorage value:', postVisibility)
            // Keep using the localStorage value already set in useState
          }
          
        } else {
          toast.error("Failed to fetch profile")
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'Please sign in to view your profile') {
          toast.error("Please sign in to view your profile")
          navigate('/signin')
        } else {
          toast.error("Error loading profile")
          console.error("Profile error:", error)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchUserProfile()
  }, [navigate, postVisibility])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    // Validate file size (e.g., 5MB limit)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      toast.error('File size should be less than 5MB')
      return
    }

    try {
      setUploading(true)
      
      // Send the file directly to our backend
      const response = await profileApi.uploadProfilePicture(file)
      console.log('Upload response:', response) // Debug log
      
      if (response.success && response.data) {
        console.log('Updated profile picture URL:', response.data.url) // Debug log
        // Update user with new profile picture URL
        if (user) {
          const updatedUser = {
            ...user,
            profilePicture: response.data.url
          };
          setUser(updatedUser);
        }
        toast.success("Profile picture updated successfully")
      } else {
        toast.error(response.message || "Failed to update profile picture")
      }
    } catch (error) {
      console.error('Upload error:', error)
      if (axios.isAxiosError(error)) {
        console.error('Error details:', error.response?.data)
        toast.error(error.response?.data?.message || "Failed to upload profile picture")
      } else {
        toast.error(error instanceof Error ? error.message : "Failed to upload profile picture")
      }
    } finally {
      setUploading(false)
    }
  }

  const handleToggleVisibility = async () => {
    const newVisibility = postVisibility === "public" ? "friends" : "public"
    console.log(`Toggling visibility from ${postVisibility} to ${newVisibility}`)
    setSwitchLoading(true)
    
    try {
      // Update server first
      console.log('Sending update to server...')
      const updateResponse = await profileApi.updatePostVisibility(newVisibility)
      console.log('Server update response:', updateResponse)
      
      // Then update UI state after successful server update
      setPostVisibility(newVisibility)
      console.log('Updated postVisibility state to:', newVisibility)
      
      // Update user object locally to keep it in sync
      if (user) {
        const updatedUser = {
          ...user,
          postVisibility: newVisibility as "public" | "friends"
        }
        setUser(updatedUser)
        console.log('Updated user object with new visibility')
      }
      
      toast.success(`Visibility set to ${newVisibility}`)
      
      // Immediately save to localStorage as backup
      localStorage.setItem('postVisibility', newVisibility)
      console.log('Saved to localStorage:', newVisibility)
      
      // Refresh user data after a short delay to ensure server has processed the update
      setTimeout(async () => {
        try {
          console.log('Refreshing user data to verify update...')
          const refreshResponse = await authApi.getMe()
          console.log('Refresh response:', refreshResponse)
          
          if (refreshResponse.success && refreshResponse.user) {
            setUser(refreshResponse.user)
            console.log('User refreshed from server')
            
            // Check if server has the updated value
            if (refreshResponse.user.postVisibility) {
              console.log('Server postVisibility after refresh:', refreshResponse.user.postVisibility)
              if (refreshResponse.user.postVisibility !== newVisibility) {
                console.warn('Warning: Server value does not match local value')
              }
            } else {
              console.warn('Warning: postVisibility field missing in refreshed user data')
            }
          }
        } catch (refreshError) {
          console.error('Error refreshing user data:', refreshError)
        }
      }, 500)
    } catch (error) {
      console.error('Failed to update visibility:', error)
      toast.error("Failed to update visibility")
    } finally {
      setSwitchLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">No profile data available</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="flex flex-col items-center space-y-4">
          <div className="relative w-32 h-32">
            <div className="w-full h-full rounded-full bg-emerald-100 flex items-center justify-center overflow-hidden">
              {user.profilePicture ? (
                <img 
                  src={user.profilePicture} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error('Image load error:', e)
                    e.currentTarget.src = '' // Clear the src to show the fallback
                  }}
                />
              ) : (
                <User className="w-16 h-16 text-emerald-600" />
              )}
            </div>
            <div className="absolute bottom-0 right-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full bg-emerald-50 hover:bg-emerald-100"
                onClick={() => document.getElementById('profile-picture-input')?.click()}
              >
                <Upload className="h-4 w-4 text-emerald-600" />
              </Button>
              <input
                id="profile-picture-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </div>
          </div>

          {/* Centered Switch Toggle below profile picture */}
          <div className="flex flex-col items-center mt-2">
            <p className="text-sm text-gray-500 mb-1">Post Visibility</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Friends Only</span>
              <Switch
                id="account-status"
                checked={postVisibility === "public"}
                onCheckedChange={handleToggleVisibility}
                disabled={switchLoading}
                className="data-[state=checked]:bg-emerald-500"
              />
              <span className="text-xs text-gray-400">Public</span>
            </div>
            <span className="text-xs font-medium text-emerald-600 mt-1">
              Current: {postVisibility === "public" ? "Public" : "Friends Only"}
            </span>
          </div>

          <CardTitle className="text-2xl font-bold text-emerald-600">{user.name}</CardTitle>
          <p className="text-gray-500">@{user.username}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-4">
            <User className="h-6 w-6 text-emerald-600" />
            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p className="text-lg font-medium">{user.name}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <User className="h-6 w-6 text-emerald-600" />
            <div>
              <p className="text-sm text-gray-500">Username</p>
              <p className="text-lg font-medium">{user.username}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Mail className="h-6 w-6 text-emerald-600" />
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="text-lg font-medium">{user.email}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Shield className="h-6 w-6 text-emerald-600" />
            <div>
              <p className="text-sm text-gray-500">Role</p>
              <p className="text-lg font-medium capitalize">{user.role}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Profile