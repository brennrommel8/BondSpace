import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Users, Eye, EyeOff } from "lucide-react"
import { PageTransition } from "@/components/ui/page-transition"
import { authApi, SignUpData } from "@/api/authApi"
import { useState } from "react"
import { SuccessDialog } from "@/components/ui/success-dialog"

const SignUp = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<SignUpData>({
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  })
  const [error, setError] = useState<string>("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear field error when user types
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setFieldErrors({})
    setIsLoading(true)

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      setFieldErrors({
        password: "Passwords do not match",
        confirmPassword: "Passwords do not match"
      })
      setIsLoading(false)
      return
    }

    try {
      const response = await authApi.signUp(formData)
      
      if (response.success) {
        setShowSuccess(true)
      } else {
        // Handle validation errors
        if (response.errors) {
          setFieldErrors(response.errors)
        } else if (response.message) {
          setError(response.message)
        }
      }
    } catch (error: any) {
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuccessClose = () => {
    setShowSuccess(false)
    navigate('/SignIn')
  }

  return (
    <PageTransition direction="right">
      <div className="min-h-screen bg-gradient-to-b from-white to-emerald-50">
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
              <h1 className="text-xl font-semibold text-emerald-900 mb-1">Create Account</h1>
              <p className="text-sm text-emerald-700">Join BondSpace and connect with others</p>
            </div>

            {/* Sign Up Form */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                  {error}
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="name" className="text-sm font-medium text-emerald-800">
                    Full Name
                  </label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    className={`border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500 h-9 ${
                      fieldErrors.name ? 'border-red-500' : ''
                    }`}
                    required
                  />
                  {fieldErrors.name && (
                    <p className="text-red-500 text-xs">{fieldErrors.name}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="username" className="text-sm font-medium text-emerald-800">
                    Username
                  </label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Choose a username"
                    className={`border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500 h-9 ${
                      fieldErrors.username ? 'border-red-500' : ''
                    }`}
                    required
                  />
                  {fieldErrors.username && (
                    <p className="text-red-500 text-xs">{fieldErrors.username}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-sm font-medium text-emerald-800">
                    Email
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    className={`border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500 h-9 ${
                      fieldErrors.email ? 'border-red-500' : ''
                    }`}
                    required
                  />
                  {fieldErrors.email && (
                    <p className="text-red-500 text-xs">{fieldErrors.email}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-sm font-medium text-emerald-800">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Create a password"
                      className={`border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500 h-9 pr-10 ${
                        fieldErrors.password ? 'border-red-500' : ''
                      }`}
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
                  {fieldErrors.password && (
                    <p className="text-red-500 text-xs">{fieldErrors.password}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="confirmPassword" className="text-sm font-medium text-emerald-800">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm your password"
                      className={`border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500 h-9 pr-10 ${
                        fieldErrors.confirmPassword ? 'border-red-500' : ''
                      }`}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-9 w-9 text-emerald-600 hover:text-emerald-700"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {fieldErrors.confirmPassword && (
                    <p className="text-red-500 text-xs">{fieldErrors.confirmPassword}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 h-9 text-sm"
                  disabled={isLoading}
                >
                  {isLoading ? "Creating Account..." : "Create Account"}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-xs text-emerald-700">
                  Already have an account?{" "}
                  <Button
                    variant="link"
                    className="text-emerald-600 hover:text-emerald-700 p-0 h-auto text-xs font-medium"
                    onClick={() => navigate('/SignIn')}
                  >
                    Sign in
                  </Button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SuccessDialog
        isOpen={showSuccess}
        onClose={handleSuccessClose}
        title="Account Created!"
        message="Your account has been created successfully. You can now sign in."
        buttonText="Go to Sign In"
      />
    </PageTransition>
  )
}

export default SignUp