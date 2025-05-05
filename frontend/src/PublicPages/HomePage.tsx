import { Button } from "@/components/ui/button"
import { ArrowRight, Users, MessageSquare, Heart, Newspaper, Bell } from "lucide-react"
import { useNavigate } from "react-router-dom"

const HomePage = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-emerald-50">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center text-center space-y-6">
          {/* Custom Logo */}
          <div className="relative w-24 h-24 mb-4">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl transform rotate-45"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center shadow-lg">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg transform -rotate-45"></div>
              </div>
            </div>
          </div>
          
          <h1 className="text-6xl font-bold tracking-tight text-emerald-900">
            BondSpace
          </h1>
          <p className="text-xl text-emerald-700 max-w-2xl">
            Where connections grow stronger. Share moments, build relationships, and stay connected with your world.
          </p>
          <div className="flex gap-4">
            <Button 
              size="lg" 
              className="bg-emerald-600 hover:bg-emerald-700 px-8 py-6 text-lg shadow-lg hover:shadow-emerald-200 transition-all duration-300"
              onClick={() => navigate('/SignIn')}
            >
              Join Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-emerald-600 text-emerald-600 px-8 py-6 text-lg hover:bg-emerald-50 transition-all duration-300"
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <section className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-12">
          {/* Features List */}
          <div className="flex-1 space-y-8">
            <div className="flex items-start space-x-4 p-4 rounded-xl hover:bg-emerald-50 transition-all duration-300">
              <div className="flex-shrink-0 w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center shadow-sm">
                <Users className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-emerald-800">Connect with Friends</h3>
                <p className="text-emerald-700 mt-1">Find and connect with people you know. Send friend requests and build your network</p>
              </div>
            </div>
            <div className="flex items-start space-x-4 p-4 rounded-xl hover:bg-emerald-50 transition-all duration-300">
              <div className="flex-shrink-0 w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center shadow-sm">
                <Newspaper className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-emerald-800">News Feed</h3>
                <p className="text-emerald-700 mt-1">Stay updated with posts, photos, and updates from your friends and family</p>
              </div>
            </div>
            <div className="flex items-start space-x-4 p-4 rounded-xl hover:bg-emerald-50 transition-all duration-300">
              <div className="flex-shrink-0 w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center shadow-sm">
                <MessageSquare className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-emerald-800">Chat</h3>
                <p className="text-emerald-700 mt-1">Chat with friends and family in real-time. Share photos, videos, and more</p>
              </div>
            </div>
            <div className="flex items-start space-x-4 p-4 rounded-xl hover:bg-emerald-50 transition-all duration-300">
              <div className="flex-shrink-0 w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center shadow-sm">
                <Bell className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-emerald-800">Notifications</h3>
                <p className="text-emerald-700 mt-1">Never miss an update with real-time notifications about your connections</p>
              </div>
            </div>
          </div>

          {/* Connection Image */}
          <div className="flex-1 flex justify-center">
            <img 
              src="/SocMed.png" 
              alt="People connecting through BondSpace" 
              className="w-full max-w-md"
            />
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-12 text-center text-white shadow-xl">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                <Heart className="h-10 w-10 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-10 h-10 bg-emerald-400 rounded-full animate-pulse"></div>
              <div className="absolute -bottom-2 -left-2 w-10 h-10 bg-emerald-400 rounded-full animate-pulse"></div>
            </div>
          </div>
          <h2 className="text-4xl font-bold mb-4">Join Our Growing Community</h2>
          <p className="text-emerald-100 text-lg mb-8">Be part of a network where meaningful connections thrive</p>
          <Button 
            size="lg" 
            variant="secondary" 
            className="bg-white text-emerald-600 hover:bg-emerald-50 px-8 py-6 text-lg shadow-lg hover:shadow-emerald-200 transition-all duration-300"
            onClick={() => navigate('/SignUp')}
          >
            Create Your Account
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>
    </div>
  )
}

export default HomePage