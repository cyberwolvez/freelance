import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Clock, 
  BarChart3, 
  FolderOpen, 
  Users, 
  Settings, 
  LogOut,
  Menu,
  X,
  Timer,
  Play,
  Pause,
  Square
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTimer } from '../contexts/TimerContext';

const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const Layout: React.FC = () => {
  const { signOut } = useAuth();
  const { activeEntry, isRunning, elapsedTime, stopTimer, pauseTimer } = useTimer();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: BarChart3 },
    { name: 'Time Tracker', href: '/timer', icon: Clock },
    { name: 'Projects', href: '/projects', icon: FolderOpen },
    { name: 'Clients', href: '/clients', icon: Users },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white shadow-xl">
          <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <Timer className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">TimeTracker</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-gray-200 p-4">
            <button
              onClick={handleSignOut}
              className="flex w-full items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex h-16 items-center px-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <Timer className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">TimeTracker</span>
            </div>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-gray-200 p-4">
            <button
              onClick={handleSignOut}
              className="flex w-full items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-500 hover:text-gray-600 lg:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Active timer widget */}
            {activeEntry && (
              <div className="flex items-center space-x-4 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: activeEntry.projects?.color || '#3B82F6' }}
                  />
                  <span className="text-sm font-medium text-gray-900">
                    {activeEntry.projects?.name}
                  </span>
                </div>
                <div className="text-lg font-mono font-bold text-blue-700">
                  {formatTime(elapsedTime)}
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={pauseTimer}
                    className="p-1 text-blue-600 hover:text-blue-700 transition-colors"
                    title="Pause"
                  >
                    <Pause className="h-4 w-4" />
                  </button>
                  <button
                    onClick={stopTimer}
                    className="p-1 text-red-600 hover:text-red-700 transition-colors"
                    title="Stop"
                  >
                    <Square className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};