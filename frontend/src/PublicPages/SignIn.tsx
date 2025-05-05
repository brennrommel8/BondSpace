import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Users, Eye, EyeOff } from "lucide-react"
import { PageTransition } from "@/components/ui/page-transition"
import { useState, useEffect } from "react"
import { authApi } from "@/api/authApi"
import { setAuthToken } from "@/utils/authUtils"
import { toast } from "sonner"

const SignIn = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showLoading, setShowLoading] = useState(false)
  const [loadingOpacity, setLoadingOpacity] = useState(0)

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (showLoading) {
      // Fade in the loading animation
      setLoadingOpacity(1)
      // Set timeout for navigation after 3 seconds
      timeoutId = setTimeout(() => {
        navigate("/UserAccount")
      }, 3000)
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [showLoading, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await authApi.login({ email, password })
      if (response.success && response.token) {
        // Store the token in all necessary storage mechanisms
        // and initialize the socket connection
        setAuthToken(response.token)
        console.log('Successfully logged in and stored token')
        
        // Show toast notification if available
        if (typeof toast !== 'undefined') {
          toast.success('Successfully logged in!')
        }
        
        setShowLoading(true)
      } else {
        setError(response.message || "Sign in failed")
        setLoading(false)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Sign in failed")
      setLoading(false)
    }
  }

  return (
    <PageTransition direction="left">
      <div className="min-h-screen bg-gradient-to-b from-white to-emerald-50 relative">
        {/* Sign In Form */}
        <div className="container mx-auto px-4 py-6">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            className="text-emerald-600 hover:text-emerald-700 mb-6"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>

          <div className="max-w-sm mx-auto">
            {/* Logo Section */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                <Users className="w-8 h-8 text-emerald-600" />
              </div>
              <h1 className="text-xl font-semibold text-emerald-900 mb-1">Welcome Back</h1>
              <p className="text-sm text-emerald-700">Sign in to continue to your account</p>
            </div>

            {/* Sign In Form */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-sm font-medium text-emerald-800">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    className="border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500 h-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-sm font-medium text-emerald-800">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className="border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500 h-9 pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-9 w-9 text-emerald-600 hover:text-emerald-700"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember"
                      type="checkbox"
                      className="h-3.5 w-3.5 text-emerald-600 border-emerald-300 rounded focus:ring-emerald-500"
                    />
                    <label htmlFor="remember" className="ml-2 block text-sm text-emerald-700">
                      Remember me
                    </label>
                  </div>
                  <Button
                    variant="link"
                    className="text-emerald-600 hover:text-emerald-700 text-xs"
                  >
                    Forgot password?
                  </Button>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-xs text-emerald-700">
                  Don't have an account?{" "}
                  <Button
                    variant="link"
                    className="text-emerald-600 hover:text-emerald-700 p-0 h-auto text-xs font-medium"
                    onClick={() => navigate('/SignUp')}
                  >
                    Sign up
                  </Button>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Loading Video Overlay */}
        {showLoading && (
          <div 
            className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm transition-opacity duration-300"
            style={{ opacity: loadingOpacity }}
          >
            <div className="text-center">
              <div className="w-40 h-40 mx-auto">
                <video
                  autoPlay
                  loop
                  muted
                  className="w-full h-full"
                >
                  <source src="/loading.webm" type="video/webm" />
                </video>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  )
}

export default SignIn