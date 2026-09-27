import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
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
import ResetPassword from './pages/ResetPassword';
import SbclForm from './pages/SbclForm';
import SbclProfile from './pages/SbclProfile';
import SbclReferralNetwork from './pages/SbclReferralNetwork';
import SubReferralJoin from './pages/SubReferralJoin';
import { AuthProvider, useAuth } from './context/AuthContext';

// Protects routes — redirects to /auth if not logged in
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center text-white/40 text-sm tracking-wider">Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function RoleAwarePage({ kind, children }: { kind: 'dashboard' | 'profile'; children: React.ReactNode }) {
  const { user, loading, roleLoading, sbclCode, isAdmin } = useAuth();
  if (loading || roleLoading) return <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center text-white/40 text-sm tracking-wider">Opening your workspace…</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (isAdmin) return <Navigate to="/admin" replace />;
  if (sbclCode) return <Navigate to={kind === 'profile' ? `/sbcl/${sbclCode}/profile` : `/sbcl/${sbclCode}`} replace />;
  return <>{children}</>;
}

function SbclWorkspaceRoute({ kind }: { kind: 'dashboard' | 'profile' | 'network' }) {
  const { sbclCode: requestedCode = '' } = useParams();
  const { user, loading, roleLoading, sbclCode, isAdmin } = useAuth();
  const requested = requestedCode.toUpperCase();
  const subPath = kind === 'profile' ? '/profile' : kind === 'network' ? '/network' : '';
  if (loading || roleLoading) return <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center text-white/40 text-sm tracking-wider">Opening SBCL workspace…</div>;
  if (!user) return <Navigate to={`/auth?returnTo=${encodeURIComponent(`/sbcl/${requested}${subPath}`)}`} replace />;
  if (!isAdmin && !sbclCode) return <Navigate to="/dashboard" replace />;
  if (!isAdmin && requested !== sbclCode) return <Navigate to={`/sbcl/${sbclCode}${subPath}`} replace />;
  if (kind === 'profile') return <SbclProfile />;
  if (kind === 'network') return <SbclReferralNetwork />;
  return <SbclDashboard />;
}

function AppRoutes() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/auth';
  const isFormPage =
    location.pathname.startsWith('/f/') ||
    location.pathname.startsWith('/join-team/') ||
    location.pathname.startsWith('/join/') ||
    location.pathname.includes('/join');
  const hideNav = isAuthPage || isFormPage;

  return (
    <div className={`relative w-full min-h-screen bg-[#0B0F1A] ${hideNav ? 'pb-0' : 'pb-20 md:pb-0'}`}>
      {!hideNav && <Navbar />}
      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/reward" element={<Reward />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/giveaway" element={<Giveaway />} />
        
        {/* Protected — must be logged in */}
        <Route path="/dashboard" element={<RoleAwarePage kind="dashboard"><Dashboard /></RoleAwarePage>} />
        <Route path="/profile" element={<RoleAwarePage kind="profile"><Profile /></RoleAwarePage>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/rewards" element={<Rewards />} />
        {/* Public */}
        <Route path="/auth" element={<Auth />} />
        <Route path="/winners" element={<Winners />} />
        <Route path="/sbcl/:sbclCode" element={<SbclWorkspaceRoute kind="dashboard" />} />
        <Route path="/sbcl/:sbclCode/network" element={<SbclWorkspaceRoute kind="network" />} />
        <Route path="/sbcl/:sbclCode/profile" element={<SbclWorkspaceRoute kind="profile" />} />
        <Route path="/sbcl/:sbclCode/join" element={<SubReferralJoin />} />
        <Route path="/join-team/:sbclCode" element={<SubReferralJoin />} />
        <Route path="/f/:formCode" element={<SbclForm />} />
        <Route path="/join/:referralCode" element={<Join />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/invitations" element={<AdminDashboard view="invitations" />} />
        <Route path="/admin/activity" element={<AdminDashboard view="activity" />} />
        <Route path="/admin/signups" element={<AdminDashboard view="signups" />} />
        <Route path="/admin/forms" element={<AdminDashboard view="forms" />} />
        <Route path="/admin/network" element={<AdminDashboard view="network" />} />
        <Route path="/admin/registry" element={<AdminDashboard view="registry" />} />
        <Route path="/admin/exports" element={<AdminDashboard view="exports" />} />
        <Route path="/sbcl/verify" element={<SbclVerify />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
      {/* Bottom nav only visible on mobile and only when logged in */}
      {!hideNav && <BottomNav />}


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
