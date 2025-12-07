import React, { useState, useEffect } from 'react';
import { Users, Shield, Activity, TrendingUp, ArrowRight, Clock, BarChart3, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    adminUsers: 0,
    regularUsers: 0,
    newUsersToday: 0,
    newUsersThisWeek: 0,
    newUsersThisMonth: 0,
    totalActions: 0,
    actionsToday: 0,
    actionsThisWeek: 0,
    totalProjects: 0,
    totalClients: 0,
    totalTimeEntries: 0,
  });
  const [recentActions, setRecentActions] = useState<any[]>([]);
  const [userGrowthData, setUserGrowthData] = useState<any[]>([]);
  const [actionTrendData, setActionTrendData] = useState<any[]>([]);
  const [userRoleDistribution, setUserRoleDistribution] = useState<any[]>([]);
  const [topActiveUsers, setTopActiveUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, role, created_at');

      if (profiles) {
        const totalUsers = profiles.length;
        const adminUsers = profiles.filter((p: any) => p.role === 'admin').length;
        const regularUsers = totalUsers - adminUsers;

        const today = startOfDay(new Date());
        const weekAgo = startOfDay(subDays(new Date(), 7));
        const monthAgo = startOfDay(subDays(new Date(), 30));

        const newUsersToday = profiles.filter((p: any) => 
          new Date(p.created_at) >= today
        ).length;
        const newUsersThisWeek = profiles.filter((p: any) => 
          new Date(p.created_at) >= weekAgo
        ).length;
        const newUsersThisMonth = profiles.filter((p: any) => 
          new Date(p.created_at) >= monthAgo
        ).length;

        setStats((prev) => ({ 
          ...prev, 
          totalUsers, 
          adminUsers, 
          regularUsers,
          newUsersToday,
          newUsersThisWeek,
          newUsersThisMonth,
        }));

        const growthData = [];
        for (let i = 29; i >= 0; i--) {
          const date = subDays(new Date(), i);
          const dateStart = startOfDay(date);
          const dateEnd = endOfDay(date);
          const usersOnDate = profiles.filter((p: any) => {
            const created = new Date(p.created_at);
            return created >= dateStart && created <= dateEnd;
          }).length;
          growthData.push({
            date: format(date, 'MMM dd'),
            users: usersOnDate,
          });
        }
        setUserGrowthData(growthData);

        const roleData = [
          { name: 'Regular Users', value: regularUsers, color: '#3B82F6' },
          { name: 'Admin Users', value: adminUsers, color: '#8B5CF6' },
        ];
        setUserRoleDistribution(roleData);
      }

      const { data: actions } = await supabase
        .from('admin_actions')
        .select(`
          *,
          profiles!admin_user_id(id, email, full_name)
        `)
        .order('created_at', { ascending: false });

      if (actions) {
        const today = startOfDay(new Date());
        const weekAgo = startOfDay(subDays(new Date(), 7));

        const actionsToday = actions.filter(
          (a: any) => new Date(a.created_at) >= today
        ).length;
        const actionsThisWeek = actions.filter(
          (a: any) => new Date(a.created_at) >= weekAgo
        ).length;

        setStats((prev) => ({
          ...prev,
          totalActions: actions.length,
          actionsToday,
          actionsThisWeek,
        }));

        setRecentActions(actions.slice(0, 10));

        const trendData = [];
        for (let i = 6; i >= 0; i--) {
          const date = subDays(new Date(), i);
          const dateStart = startOfDay(date);
          const dateEnd = endOfDay(date);
          const actionsOnDate = actions.filter((a: any) => {
            const created = new Date(a.created_at);
            return created >= dateStart && created <= dateEnd;
          }).length;
          trendData.push({
            date: format(date, 'MMM dd'),
            actions: actionsOnDate,
          });
        }
        setActionTrendData(trendData);
      }

      const { data: projects } = await supabase
        .from('projects')
        .select('id');

      if (projects) {
        setStats((prev) => ({ ...prev, totalProjects: projects.length }));
      }

      const { data: clients } = await supabase
        .from('clients')
        .select('id');

      if (clients) {
        setStats((prev) => ({ ...prev, totalClients: clients.length }));
      }

      const { data: timeEntries } = await supabase
        .from('time_entries')
        .select('id, user_id, duration');

      if (timeEntries) {
        setStats((prev) => ({ ...prev, totalTimeEntries: timeEntries.length }));

        const userActivity = timeEntries.reduce((acc: any, entry: any) => {
          if (!acc[entry.user_id]) {
            acc[entry.user_id] = { userId: entry.user_id, count: 0, totalDuration: 0 };
          }
          acc[entry.user_id].count += 1;
          acc[entry.user_id].totalDuration += entry.duration || 0;
          return acc;
        }, {});

        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('id, email, full_name');

        const topUsers = Object.values(userActivity)
          .map((activity: any) => {
            const profile = allProfiles?.find((p: any) => p.id === activity.userId);
            return {
              ...activity,
              email: profile?.email || 'Unknown',
              name: profile?.full_name || profile?.email || 'Unknown',
            };
          })
          .sort((a: any, b: any) => b.count - a.count)
          .slice(0, 5);

        setTopActiveUsers(topUsers);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">System overview, analytics, and user management.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Total Users</h3>
          <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
          <p className="text-xs text-gray-500 mt-1">{stats.newUsersToday} new today</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-50 p-3 rounded-lg">
              <Shield className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Admin Users</h3>
          <p className="text-2xl font-bold text-gray-900">{stats.adminUsers}</p>
          <p className="text-xs text-gray-500 mt-1">{stats.regularUsers} regular users</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-teal-50 p-3 rounded-lg">
              <Activity className="h-6 w-6 text-teal-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Actions Today</h3>
          <p className="text-2xl font-bold text-gray-900">{stats.actionsToday}</p>
          <p className="text-xs text-gray-500 mt-1">{stats.totalActions} total</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-50 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">New Users (Week)</h3>
          <p className="text-2xl font-bold text-gray-900">{stats.newUsersThisWeek}</p>
          <p className="text-xs text-gray-500 mt-1">{stats.newUsersThisMonth} this month</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-amber-50 p-3 rounded-lg">
              <Database className="h-6 w-6 text-amber-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Total Projects</h3>
          <p className="text-2xl font-bold text-gray-900">{stats.totalProjects}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-indigo-50 p-3 rounded-lg">
              <Users className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Total Clients</h3>
          <p className="text-2xl font-bold text-gray-900">{stats.totalClients}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-pink-50 p-3 rounded-lg">
              <Clock className="h-6 w-6 text-pink-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Time Entries</h3>
          <p className="text-2xl font-bold text-gray-900">{stats.totalTimeEntries}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-cyan-50 p-3 rounded-lg">
              <BarChart3 className="h-6 w-6 text-cyan-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Actions (Week)</h3>
          <p className="text-2xl font-bold text-gray-900">{stats.actionsThisWeek}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">User Growth (Last 30 Days)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar dataKey="users" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Admin Activity Trend (Last 7 Days)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={actionTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Line type="monotone" dataKey="actions" stroke="#8b5cf6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">User Role Distribution</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={userRoleDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {userRoleDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Active Users</h2>
          <div className="divide-y divide-gray-100">
            {topActiveUsers.length === 0 ? (
              <div className="py-8 text-center text-gray-500 text-sm">
                No activity data available
              </div>
            ) : (
              topActiveUsers.map((user: any, index: number) => (
                <div key={user.userId} className="py-4 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{user.count} entries</p>
                    <p className="text-xs text-gray-500">
                      {Math.floor(user.totalDuration / 3600)}h {Math.floor((user.totalDuration % 3600) / 60)}m
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6 space-y-3">
            <button
              onClick={() => navigate('/admin/users')}
              className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <Users className="h-5 w-5 text-gray-400 group-hover:text-blue-600" />
                <span className="text-sm font-medium text-gray-900">Manage Users</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
            </button>
            <button
              onClick={() => navigate('/admin/logs')}
              className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <Activity className="h-5 w-5 text-gray-400 group-hover:text-blue-600" />
                <span className="text-sm font-medium text-gray-900">View Activity Logs</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Recent Admin Activity</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {recentActions.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">
                No recent activity
              </div>
            ) : (
              recentActions.map((action) => (
                <div key={action.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 capitalize">
                        {action.action.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {action.profiles?.full_name || action.profiles?.email || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {format(new Date(action.created_at), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
