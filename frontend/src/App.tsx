import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AppRoute from './routes/route'
import { Toaster } from "sonner"
import { useAuth } from './hooks/useAuth'
import { useEffect } from 'react'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 5, // 5 minutes (replaces cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

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
      <Toaster />
      <AuthProvider>
        <AppRoute />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App