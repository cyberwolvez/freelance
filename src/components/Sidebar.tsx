import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Timer, LayoutDashboard, Users, FolderOpen, FileText, Settings, LogOut, Shield, 
  Activity, Kanban, History, BarChart3, Clock, CheckSquare
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  userRole: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ userRole }) => {
  const { signOut } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
      window.location.href = '/';
    }
  };

  const userNavItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/timer', icon: Timer, label: 'Timer' },
    { path: '/projects', icon: FolderOpen, label: 'Projects' },
    { path: '/clients', icon: Users, label: 'Clients' },
    { path: '/boards', icon: Kanban, label: 'Boards' },
    { path: '/time-entries', icon: Clock, label: 'Time Entries' },
    { path: '/reports', icon: FileText, label: 'Reports' },
    { path: '/activity', icon: History, label: 'Activity' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const adminNavItems = [
    { path: '/admin', icon: Shield, label: 'Dashboard' },
    { path: '/admin/users', icon: Users, label: 'Users' },
    { path: '/admin/projects', icon: FolderOpen, label: 'All Projects' },
    { path: '/admin/clients', icon: Users, label: 'All Clients' },
    { path: '/admin/boards', icon: Kanban, label: 'All Boards' },
    { path: '/admin/tasks', icon: CheckSquare, label: 'All Tasks' },
    { path: '/admin/time-entries', icon: Clock, label: 'Time Entries' },
    { path: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/admin/logs', icon: Activity, label: 'Activity Logs' },
  ];

  const navItems = userRole === 'admin' ? adminNavItems : userNavItems;

  const isActive = (path: string) => {
    if (path === '/admin' || path === '/dashboard') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex">
      <div className={`bg-white border-r border-gray-200 h-screen fixed left-0 top-0 z-30 transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              {!collapsed && (
                <Link to={userRole === 'admin' ? '/admin' : '/dashboard'} className="flex items-center space-x-2">
                  <div className="bg-blue-600 p-2 rounded-lg">
                    <Timer className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xl font-bold text-gray-900">TimeTracker</span>
                </Link>
              )}
              {collapsed && (
                <Link to={userRole === 'admin' ? '/admin' : '/dashboard'} className="flex items-center justify-center">
                  <div className="bg-blue-600 p-2 rounded-lg">
                    <Timer className="h-6 w-6 text-white" />
                  </div>
                </Link>
              )}
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg
                  className={`h-5 w-5 transition-transform ${collapsed ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto py-4">
            <div className="px-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors group ${
                      active
                        ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    title={collapsed ? item.label : ''}
                  >
                    <Icon className={`h-5 w-5 flex-shrink-0 ${active ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                    {!collapsed && (
                      <span className="text-sm font-medium">{item.label}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="p-4 border-t border-gray-200">
            {userRole === 'admin' && !collapsed && (
              <div className="mb-4 px-4 py-2 bg-purple-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-purple-600" />
                  <span className="text-xs font-medium text-purple-800">Admin Mode</span>
                </div>
              </div>
            )}
            <button
              onClick={handleSignOut}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors group ${
                collapsed ? 'justify-center' : ''
              }`}
              title={collapsed ? 'Sign Out' : ''}
            >
              <LogOut className="h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-red-600" />
              {!collapsed && <span className="text-sm font-medium">Sign Out</span>}
            </button>
          </div>
        </div>
      </div>
      <div className={`flex-shrink-0 transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}></div>
    </div>
  );
};
