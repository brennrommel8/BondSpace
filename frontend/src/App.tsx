import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AppRoute from './routes/route'
import { Toaster } from "sonner"
import { useAuth } from './hooks/useAuth'
import { useEffect } from 'react'

const queryClient = new QueryClient()

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { checkAuthStatus, authChecked } = useAuth();
  
  useEffect(() => {
    if (!authChecked) {
      checkAuthStatus();
    }
  }, [authChecked, checkAuthStatus]);
  
  return <>{children}</>;
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" richColors />
      <AuthProvider>
        <AppRoute />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App