import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { User, Settings, LogOut } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { authApi } from "@/api/authApi"
import { toast } from "sonner"
import { useState, useEffect } from "react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

interface AvatarDropdownProps {
  isMobile?: boolean
}

export function AvatarDropdown({ isMobile = false }: AvatarDropdownProps) {
  const navigate = useNavigate()
  const [profilePicture, setProfilePicture] = useState<string | undefined>(undefined)

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

  const handleLogout = async () => {
    try {
      await authApi.logout()
      toast.success("Logged out successfully")
      navigate('/signin')
    } catch (error) {
      toast.error("Failed to logout")
      console.error("Logout error:", error)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`${isMobile ? 'h-10 w-10' : 'h-10 w-10'} rounded-full overflow-hidden p-0`}
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={profilePicture} alt="Profile" />
            <AvatarFallback className="bg-emerald-50 text-emerald-600">
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align={isMobile ? "start" : "end"} 
        className={`${isMobile ? 'w-full' : 'w-56'} bg-white`}
      >
        <DropdownMenuItem onClick={() => navigate('/profile')}>
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/settings')}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 