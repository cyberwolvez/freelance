import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TimerProvider } from './contexts/TimerContext';
import { Layout } from './components/Layout';
import { AuthForm } from './components/AuthForm';
import { Dashboard } from './pages/Dashboard';
import { Timer } from './pages/Timer';
import { Projects } from './pages/Projects';
import { Clients } from './pages/Clients';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { TaskBoards } from './pages/TaskBoards';
import { ActivityLog } from './pages/ActivityLog';
import { Forbidden } from './pages/Forbidden';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUsers } from './pages/admin/AdminUsers';
import { UserDetails } from './pages/admin/UserDetails';
import { AdminLogs } from './pages/admin/AdminLogs';
import { AdminProjects } from './pages/admin/AdminProjects';
import { AdminClients } from './pages/admin/AdminClients';
import { AdminBoards } from './pages/admin/AdminBoards';
import { AdminTasks } from './pages/admin/AdminTasks';
import { AdminTimeEntries } from './pages/admin/AdminTimeEntries';
import { AdminAnalytics } from './pages/admin/AdminAnalytics';
import { TimeEntries } from './pages/TimeEntries';
import { useRequireAdmin } from './hooks/useRequireAdmin';
import { supabase } from './lib/supabase';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const [userRole, setUserRole] = React.useState<string | null>(null);

  React.useEffect(() => {
    const checkRole = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      if (data) setUserRole(data.role);
    };
    checkRole();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (userRole === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return <Layout>{children}</Layout>;
};

const AdminOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading } = useRequireAdmin();

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return <Layout>{children}</Layout>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const [redirectPath, setRedirectPath] = React.useState<string | null>(null);

  React.useEffect(() => {
    const checkRole = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (data?.role === 'admin') {
        setRedirectPath('/admin');
      } else {
        setRedirectPath('/dashboard');
      }
    };
    if (user) {
      checkRole();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (user && redirectPath) {
    return <Navigate to={redirectPath} replace />;
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <TimerProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/"
              element={
                <PublicRoute>
                  <AuthForm />
                </PublicRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/timer"
              element={
                <ProtectedRoute>
                  <Timer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects"
              element={
                <ProtectedRoute>
                  <Projects />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clients"
              element={
                <ProtectedRoute>
                  <Clients />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/boards"
              element={
                <ProtectedRoute>
                  <TaskBoards />
                </ProtectedRoute>
              }
            />
            <Route
              path="/activity"
              element={
                <ProtectedRoute>
                  <ActivityLog />
                </ProtectedRoute>
              }
            />
            <Route
              path="/time-entries"
              element={
                <ProtectedRoute>
                  <TimeEntries />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminOnlyRoute>
                  <AdminDashboard />
                </AdminOnlyRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <AdminOnlyRoute>
                  <AdminUsers />
                </AdminOnlyRoute>
              }
            />
            <Route
              path="/admin/users/:id"
              element={
                <AdminOnlyRoute>
                  <UserDetails />
                </AdminOnlyRoute>
              }
            />
            <Route
              path="/admin/logs"
              element={
                <AdminOnlyRoute>
                  <AdminLogs />
                </AdminOnlyRoute>
              }
            />
            <Route
              path="/admin/projects"
              element={
                <AdminOnlyRoute>
                  <AdminProjects />
                </AdminOnlyRoute>
              }
            />
            <Route
              path="/admin/clients"
              element={
                <AdminOnlyRoute>
                  <AdminClients />
                </AdminOnlyRoute>
              }
            />
            <Route
              path="/admin/boards"
              element={
                <AdminOnlyRoute>
                  <AdminBoards />
                </AdminOnlyRoute>
              }
            />
            <Route
              path="/admin/tasks"
              element={
                <AdminOnlyRoute>
                  <AdminTasks />
                </AdminOnlyRoute>
              }
            />
            <Route
              path="/admin/time-entries"
              element={
                <AdminOnlyRoute>
                  <AdminTimeEntries />
                </AdminOnlyRoute>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <AdminOnlyRoute>
                  <AdminAnalytics />
                </AdminOnlyRoute>
              }
            />
            <Route path="/403" element={<Forbidden />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </TimerProvider>
    </AuthProvider>
  );
}

export default App;

