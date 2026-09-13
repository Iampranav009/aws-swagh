import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import Leaderboard from './pages/Leaderboard';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Auth from './pages/Auth';
import Notifications from './pages/Notifications';
import Reward from './pages/Reward';
import Rewards from './pages/Rewards';
import Giveaway from './pages/Giveaway';
import Winners from './pages/Winners';
import SbclDashboard from './pages/SbclDashboard';
import Join from './pages/Join';
import AdminDashboard from './pages/AdminDashboard';
import SbclVerify from './pages/SbclVerify';
import { AuthProvider, useAuth } from './context/AuthContext';

// Protects routes — redirects to /auth if not logged in
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center text-white/40 text-sm tracking-wider">Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/auth';

  return (
    <div className="relative w-full min-h-screen bg-[#0B0F1A] pb-20 md:pb-0">
      {!isAuthPage && <Navbar />}
      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/reward" element={<Reward />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/giveaway" element={<Giveaway />} />
        
        {/* Protected — must be logged in */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/rewards" element={<Rewards />} />
        {/* Public */}
        <Route path="/auth" element={<Auth />} />
        <Route path="/winners" element={<Winners />} />
        <Route path="/sbcl/:sbclCode" element={<SbclDashboard />} />
        <Route path="/join/:referralCode" element={<Join />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/invitations" element={<AdminDashboard view="invitations" />} />
        <Route path="/admin/activity" element={<AdminDashboard view="activity" />} />
        <Route path="/admin/signups" element={<AdminDashboard view="signups" />} />
        <Route path="/admin/network" element={<AdminDashboard view="network" />} />
        <Route path="/admin/exports" element={<AdminDashboard view="exports" />} />
        <Route path="/sbcl/verify" element={<SbclVerify />} />
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
      {/* Bottom nav only visible on mobile and only when logged in */}
      {!isAuthPage && <BottomNav />}


    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
