import { Button } from "@/components/ui/button"
import { Search, Home, Users, Bell, MessageSquare, Plus, Menu, X } from "lucide-react"
import { useNavigate, useLocation } from "react-router-dom"
import { useState, useRef, useEffect } from "react"
import { AvatarDropdown } from "./avatar-dropdown"
import { useSearchUsers } from "@/hooks/useSearchUsers"
import { UserSearchResult } from "@/api/searchApi"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CreatePostDialog } from "./create-post-dialog"
import { ChatDropdown } from "./chat-dropdown"
import { getProfileImageUrl } from "@/utils/profileImageUtils"

const Navbar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)
  const mobileChatRef = useRef<HTMLDivElement>(null)
  const { data: searchResults, isLoading } = useSearchUsers(searchQuery)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false)
      }
      
      if (chatRef.current && !chatRef.current.contains(event.target as Node)) {
        setIsChatOpen(false)
      }
      
      if (mobileChatRef.current && !mobileChatRef.current.contains(event.target as Node)) {
        // Don't close mobile menu when clicking inside chat dropdown
        if (!event.composedPath().some(el => 
          el instanceof HTMLElement && el.classList.contains('chat-dropdown-content')
        )) {
          setIsChatOpen(false)
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const handleUserClick = (username: string) => {
    navigate(`/profile/${username}`)
    setSearchQuery("")
    setIsSearchFocused(false)
  }
  
  // Function to close mobile menu
  const handleClose = () => {
    setIsMobileMenuOpen(false)
  }

  // Function to handle navigation with menu closing
  const handleNavigation = (path: string) => {
    navigate(path)
    handleClose()
  }

  // Function to toggle mobile chat dropdown
  const toggleMobileChat = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsChatOpen(!isChatOpen)
  }

  // Handle logo click - refresh current page or go to home if on different page
  const handleLogoClick = () => {
    if (location.pathname === '/UserAccount') {
      // If already on home page, refresh the page
      window.location.reload()
    } else {
      // Otherwise navigate to home
      navigate('/UserAccount')
    }
  }

  return (
    <div className="fixed top-0 left-0 right-0 bg-white shadow-sm z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Left Section - Logo and Search */}
          <div className="flex items-center space-x-2">
            {/* Logo */}
            <div className="relative w-10 h-10 cursor-pointer" onClick={handleLogoClick}>
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl transform rotate-45"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <div className="w-3 h-3 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded transform -rotate-45"></div>
                </div>
              </div>
            </div>
            
            {/* Search Bar */}
            <div className="relative" ref={searchRef}>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search People"
                className="bg-emerald-50 rounded-full pl-10 pr-4 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => setIsSearchFocused(true)}
              />
              
              {/* Search Results Dropdown */}
              {isSearchFocused && searchQuery && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto">
                  {isLoading ? (
                    <div className="p-4 text-center text-gray-500">Loading...</div>
                  ) : !searchResults?.success || !searchResults?.data?.users?.length ? (
                    <div className="p-4 text-center text-gray-500">No results found</div>
                  ) : (
                    <div className="py-2">
                      {searchResults.data.users.map((user: UserSearchResult) => (
                        <div
                          key={user.username}
                          className="flex items-center px-4 py-2 hover:bg-emerald-50 cursor-pointer"
                          onClick={() => handleUserClick(user.username)}
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={getProfileImageUrl(user.profilePicture)} />
                            <AvatarFallback>
                              {user.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="ml-3">
                            <div className="font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">@{user.username}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Center Section - Main Navigation - Hidden on Mobile */}
          <div className="hidden md:flex items-center space-x-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-16 rounded-lg bg-emerald-50 hover:bg-emerald-100"
              onClick={() => navigate('/UserAccount')}
            >
              <Home className="h-6 w-6 text-emerald-600" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-16 rounded-lg bg-emerald-50 hover:bg-emerald-100"
            >
              <Users className="h-6 w-6 text-emerald-600" />
            </Button>
          </div>

          {/* Right Section - User Menu */}
          <div className="flex items-center space-x-2">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-10 w-10 rounded-full bg-emerald-50 hover:bg-emerald-100"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5 text-emerald-600" />
              ) : (
                <Menu className="h-5 w-5 text-emerald-600" />
              )}
            </Button>

            {/* Mobile Message Button - Visible only on small screens */}
            <div className="relative md:hidden" ref={mobileChatRef}>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full bg-emerald-50 hover:bg-emerald-100"
                onClick={toggleMobileChat}
              >
                <MessageSquare className="h-5 w-5 text-emerald-600" />
              </Button>
              
              {/* Mobile Chat Dropdown */}
              {isChatOpen && (
                <ChatDropdown 
                  isOpen={isChatOpen} 
                  onClose={() => setIsChatOpen(false)} 
                />
              )}
            </div>

            {/* Desktop Icons */}
            <div className="hidden md:flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full bg-emerald-50 hover:bg-emerald-100"
                onClick={() => setIsCreatePostOpen(true)}
              >
                <Plus className="h-5 w-5 text-emerald-600" />
              </Button>
              
              {/* Message Button with Chat Dropdown */}
              <div className="relative" ref={chatRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full bg-emerald-50 hover:bg-emerald-100"
                  onClick={(e) => {
                    // If Alt or Ctrl key is pressed, navigate directly to messages
                    if (e.altKey || e.ctrlKey) {
                      navigate('/messages');
                    } else {
                      // Otherwise toggle chat dropdown
                      setIsChatOpen(!isChatOpen);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    navigate('/messages');
                  }}
                >
                  <MessageSquare className="h-5 w-5 text-emerald-600" />
                </Button>
                
                {/* Chat Dropdown */}
                {isChatOpen && (
                  <ChatDropdown 
                    isOpen={isChatOpen} 
                    onClose={() => setIsChatOpen(false)} 
                  />
                )}
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full bg-emerald-50 hover:bg-emerald-100"
              >
                <Bell className="h-5 w-5 text-emerald-600" />
              </Button>
              <AvatarDropdown />
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Button
                variant="ghost"
                className="w-full justify-start px-4 py-2 text-base font-medium text-emerald-600 hover:bg-emerald-50"
                onClick={() => handleNavigation('/UserAccount')}
              >
                <Home className="mr-3 h-5 w-5" />
                Home
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start px-4 py-2 text-base font-medium text-emerald-600 hover:bg-emerald-50"
                onClick={handleClose}
              >
                <Users className="mr-3 h-5 w-5" />
                Friends
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start px-4 py-2 text-base font-medium text-emerald-600 hover:bg-emerald-50"
                onClick={() => handleNavigation('/messages')}
              >
                <MessageSquare className="mr-3 h-5 w-5" />
                Messages
              </Button>
            </div>
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="flex items-center px-5">
                <AvatarDropdown isMobile={true} />
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-800">User Name</div>
                  <div className="text-sm font-medium text-gray-500">View Profile</div>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start px-4 py-2 text-base font-medium text-emerald-600 hover:bg-emerald-50"
                  onClick={() => {
                    setIsCreatePostOpen(true)
                    handleClose()
                  }}
                >
                  <Plus className="mr-3 h-5 w-5" />
                  Create
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start px-4 py-2 text-base font-medium text-emerald-600 hover:bg-emerald-50"
                  onClick={() => handleNavigation('/Profile')}
                >
                  Profile
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start px-4 py-2 text-base font-medium text-emerald-600 hover:bg-emerald-50"
                  onClick={() => handleNavigation('/Settings')}
                >
                  Settings
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Create Post Dialog */}
      <CreatePostDialog
        isOpen={isCreatePostOpen}
        onClose={() => setIsCreatePostOpen(false)}
      />
    </div>
  )
}

export default Navbar