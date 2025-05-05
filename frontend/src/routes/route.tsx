import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from '@/PublicPages/HomePage';
import SignIn from '@/PublicPages/SignIn';
import SignUp from '@/PublicPages/SignUp';
import Feed from '@/UserPage/Feed';
import Navbar from '@/components/ui/navbar';
import Profile from '@/UserPage/Profile';
import Settings from '@/UserPage/Settings';
import Visit from '@/UserPage/Visit';
import Messages from '@/UserPage/Messages';

const UserLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="pt-14">
        {children}
      </div>
    </div>
  )
}

const AppRoute = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/SignIn" element={<SignIn />} />
        <Route path="/SignUp" element={<SignUp />} />
        <Route path="/UserAccount" element={
          <UserLayout>
            <Feed />
          </UserLayout>
        } />
        <Route path="/Profile" element={
          <UserLayout>
            <Profile />
          </UserLayout>
        } />
        <Route path="/Settings" element={
          <UserLayout>
            <Settings />
          </UserLayout>
        } />
        <Route path="/profile/:username" element={
          <UserLayout>
            <Visit />
          </UserLayout>
        } />
        
        {/* Message routes */}
        <Route path="/messages" element={
          <UserLayout>
            <Messages />
          </UserLayout>
        } />
        <Route path="/messages/:conversationId" element={
          <UserLayout>
            <Messages />
          </UserLayout>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRoute