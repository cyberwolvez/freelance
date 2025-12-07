import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, User, Calendar, Shield, Edit2, Trash2, Save, X, Clock, TrendingUp, DollarSign, FolderOpen, Users, Activity, BarChart3, Calendar as CalendarIcon } from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { supabase } from '../../lib/supabase';

const COLORS = ['#3B82F6', '#8B5CF6', '#14B8A6', '#F59E0B', '#EF4444', '#10B981', '#EC4899', '#6366F1'];

export const UserDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [adminActions, setAdminActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState(false);
  const [newRole, setNewRole] = useState('user');
  const [actionLoading, setActionLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const [timeStats, setTimeStats] = useState({
    totalTime: 0,
    todayTime: 0,
    weekTime: 0,
    monthTime: 0,
    totalEarnings: 0,
    averageDaily: 0,
    totalEntries: 0,
  });
  
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [recentEntries, setRecentEntries] = useState<any[]>([]);
  const [timeChartData, setTimeChartData] = useState<any[]>([]);
  const [projectTimeData, setProjectTimeData] = useState<any[]>([]);
  const [clientTimeData, setClientTimeData] = useState<any[]>([]);
  const [activityTimeline, setActivityTimeline] = useState<any[]>([]);
  const [dailyActivity, setDailyActivity] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    if (id) {
      fetchUserDetails();
      fetchAdminActions();
      fetchUserAnalytics();
    }
  }, [id, timeRange]);

  const fetchUserDetails = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setUser(data);
      setNewRole(data?.role || 'user');
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminActions = async () => {
    if (!id) return;

    try {
      const { data } = await supabase
        .from('admin_actions')
        .select(`
          *,
          profiles!admin_user_id(id, email, full_name)
        `)
        .eq('target_id', id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (data) {
        setAdminActions(data);
      }
    } catch (error) {
      console.error('Error fetching admin actions:', error);
    }
  };

  const fetchUserAnalytics = async () => {
    if (!id) return;

    try {
      const today = startOfDay(new Date());
      const weekStart = startOfWeek(today);
      const weekEnd = endOfWeek(today);
      const monthStart = startOfMonth(today);
      const monthEnd = endOfMonth(today);

      const { data: timeEntries } = await supabase
        .from('time_entries')
        .select(`
          *,
          projects (
            id,
            name,
            color,
            hourly_rate,
            clients (
              id,
              name
            )
          )
        `)
        .eq('user_id', id)
        .order('start_time', { ascending: false });

      if (timeEntries) {
        const totalTime = timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
        const todayEntries = timeEntries.filter(entry => 
          new Date(entry.start_time) >= today
        );
        const weekEntries = timeEntries.filter(entry => {
          const entryDate = new Date(entry.start_time);
          return entryDate >= weekStart && entryDate <= weekEnd;
        });
        const monthEntries = timeEntries.filter(entry => {
          const entryDate = new Date(entry.start_time);
          return entryDate >= monthStart && entryDate <= monthEnd;
        });

        const todayTime = todayEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
        const weekTime = weekEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
        const monthTime = monthEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);

        const totalEarnings = timeEntries.reduce((sum, entry) => {
          const rate = entry.projects?.hourly_rate || 0;
          const hours = (entry.duration || 0) / 3600;
          return sum + (rate * hours);
        }, 0);

        const daysWithActivity = new Set(
          timeEntries.map(entry => format(new Date(entry.start_time), 'yyyy-MM-dd'))
        ).size;
        const averageDaily = daysWithActivity > 0 ? totalTime / daysWithActivity : 0;

        setTimeStats({
          totalTime,
          todayTime,
          weekTime,
          monthTime,
          totalEarnings,
          averageDaily,
          totalEntries: timeEntries.length,
        });

        setRecentEntries(timeEntries.slice(0, 10));

        const projectTimeMap = new Map();
        const clientTimeMap = new Map();

        timeEntries.forEach((entry: any) => {
          const projectId = entry.project_id;
          const projectName = entry.projects?.name || 'Unknown';
          const projectColor = entry.projects?.color || '#3B82F6';
          const clientName = entry.projects?.clients?.name || 'No Client';
          const duration = entry.duration || 0;

          if (projectTimeMap.has(projectId)) {
            projectTimeMap.set(projectId, {
              ...projectTimeMap.get(projectId),
              time: projectTimeMap.get(projectId).time + duration,
            });
          } else {
            projectTimeMap.set(projectId, {
              name: projectName,
              color: projectColor,
              time: duration,
            });
          }

          if (clientTimeMap.has(clientName)) {
            clientTimeMap.set(clientName, clientTimeMap.get(clientName) + duration);
          } else {
            clientTimeMap.set(clientName, duration);
          }
        });

        const projectData = Array.from(projectTimeMap.values())
          .map(p => ({
            name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
            hours: Math.round((p.time / 3600) * 10) / 10,
            color: p.color,
          }))
          .sort((a, b) => b.hours - a.hours)
          .slice(0, 8);

        const clientData = Array.from(clientTimeMap.entries())
          .map(([name, time]) => ({
            name: name.length > 15 ? name.substring(0, 15) + '...' : name,
            hours: Math.round((time / 3600) * 10) / 10,
          }))
          .sort((a, b) => b.hours - a.hours)
          .slice(0, 8);

        setProjectTimeData(projectData);
        setClientTimeData(clientData);

        const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
        const chartData = [];
        for (let i = daysBack - 1; i >= 0; i--) {
          const date = subDays(new Date(), i);
          const dateStart = startOfDay(date);
          const dateEnd = endOfDay(date);
          const dayEntries = timeEntries.filter((entry: any) => {
            const entryDate = new Date(entry.start_time);
            return entryDate >= dateStart && entryDate <= dateEnd;
          });
          const dayTime = dayEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
          chartData.push({
            date: format(date, 'MMM dd'),
            hours: Math.round((dayTime / 3600) * 10) / 10,
            entries: dayEntries.length,
          });
        }
        setTimeChartData(chartData);

        const activityData = [];
        for (let i = 6; i >= 0; i--) {
          const date = subDays(new Date(), i);
          const dateStart = startOfDay(date);
          const dateEnd = endOfDay(date);
          const dayEntries = timeEntries.filter((entry: any) => {
            const entryDate = new Date(entry.start_time);
            return entryDate >= dateStart && entryDate <= dateEnd;
          });
          activityData.push({
            date: format(date, 'EEE'),
            fullDate: format(date, 'MMM dd'),
            hours: Math.round((dayEntries.reduce((sum, e) => sum + (e.duration || 0), 0) / 3600) * 10) / 10,
            entries: dayEntries.length,
          });
        }
        setDailyActivity(activityData);

        const timeline = timeEntries
          .slice(0, 50)
          .map((entry: any) => ({
            id: entry.id,
            type: 'time_entry',
            title: entry.projects?.name || 'Unknown Project',
            description: entry.description || 'No description',
            time: entry.start_time,
            duration: entry.duration,
            project: entry.projects?.name,
            client: entry.projects?.clients?.name,
            color: entry.projects?.color || '#3B82F6',
          }))
          .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

        setActivityTimeline(timeline);
      }

      const { data: projectsData } = await supabase
        .from('projects')
        .select(`
          *,
          clients (
            id,
            name
          )
        `)
        .eq('user_id', id)
        .order('created_at', { ascending: false });

      if (projectsData) {
        setProjects(projectsData);
      }

      const { data: clientsData } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', id)
        .order('created_at', { ascending: false });

      if (clientsData) {
        setClients(clientsData);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const handleSaveRole = async () => {
    if (!user || !id) return;

    setActionLoading(true);
    try {
      const { data, error } = await supabase.rpc('change_user_role', {
        target_user_id: id,
        new_role: newRole,
      });

      if (error) throw error;

      if (data?.error) {
        alert(data.error);
        return;
      }

      await fetchUserDetails();
      await fetchAdminActions();
      setEditingRole(false);
    } catch (error: any) {
      console.error('Error updating role:', error);
      alert(error.message || 'Failed to update role');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    setActionLoading(true);
    try {
      const { data, error } = await supabase.rpc('delete_user_account', {
        target_user_id: id,
      });

      if (error) throw error;

      if (data?.error) {
        alert(data.error);
        return;
      }

      navigate('/admin/users');
    } catch (error: any) {
      console.error('Error deleting user:', error);
      alert(error.message || 'Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
          <p className="text-gray-600">User not found</p>
          <button
            onClick={() => navigate('/admin/users')}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Back to Users
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <button
          onClick={() => navigate('/admin/users')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Users</span>
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{user.full_name || user.email}</h1>
            <p className="text-gray-600">Comprehensive user analytics and management</p>
          </div>
          <div className="flex items-center space-x-2">
            {editingRole ? (
              <div className="flex items-center space-x-2">
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  onClick={handleSaveRole}
                  disabled={actionLoading}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Save className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setEditingRole(false);
                    setNewRole(user.role);
                  }}
                  className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    user.role === 'admin'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {user.role}
                </span>
                <button
                  onClick={() => setEditingRole(true)}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Total Time</h3>
          <p className="text-2xl font-bold text-gray-900">{formatTime(timeStats.totalTime)}</p>
          <p className="text-xs text-gray-500 mt-1">{timeStats.totalEntries} entries</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-50 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">This Week</h3>
          <p className="text-2xl font-bold text-gray-900">{formatTime(timeStats.weekTime)}</p>
          <p className="text-xs text-gray-500 mt-1">{formatTime(timeStats.monthTime)} this month</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-amber-50 p-3 rounded-lg">
              <DollarSign className="h-6 w-6 text-amber-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Total Earnings</h3>
          <p className="text-2xl font-bold text-gray-900">${timeStats.totalEarnings.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">Based on hourly rates</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-50 p-3 rounded-lg">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Avg Daily</h3>
          <p className="text-2xl font-bold text-gray-900">{formatTime(timeStats.averageDaily)}</p>
          <p className="text-xs text-gray-500 mt-1">Per active day</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Time Tracking Trend</h2>
            <div className="flex space-x-2">
              <button
                onClick={() => setTimeRange('7d')}
                className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                  timeRange === '7d' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                7D
              </button>
              <button
                onClick={() => setTimeRange('30d')}
                className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                  timeRange === '30d' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                30D
              </button>
              <button
                onClick={() => setTimeRange('90d')}
                className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                  timeRange === '90d' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                90D
              </button>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeChartData}>
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
                <Area type="monotone" dataKey="hours" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <FolderOpen className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-900">Projects</span>
              </div>
              <span className="text-lg font-bold text-gray-900">{projects.length}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Users className="h-5 w-5 text-teal-600" />
                <span className="text-sm font-medium text-gray-900">Clients</span>
              </div>
              <span className="text-lg font-bold text-gray-900">{clients.length}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Activity className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium text-gray-900">Today</span>
              </div>
              <span className="text-lg font-bold text-gray-900">{formatTime(timeStats.todayTime)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <CalendarIcon className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-gray-900">Account Created</span>
              </div>
              <span className="text-sm font-medium text-gray-600">
                {format(new Date(user.created_at), 'MMM dd, yyyy')}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Time by Project</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectTimeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" stroke="#6b7280" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="#6b7280" fontSize={12} width={100} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar dataKey="hours" radius={[0, 4, 4, 0]}>
                  {projectTimeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Time by Client</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={clientTimeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(props: any) => `${props.name}: ${(props.percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="hours"
                >
                  {clientTimeData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Weekly Activity</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyActivity}>
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
                <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Time Entries</h2>
          <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
            {recentEntries.length === 0 ? (
              <div className="py-8 text-center text-gray-500 text-sm">
                No time entries found
              </div>
            ) : (
              recentEntries.map((entry: any) => (
                <div key={entry.id} className="py-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {entry.projects?.name || 'Unknown Project'}
                      </p>
                      {entry.description && (
                        <p className="text-xs text-gray-500 mt-1">{entry.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {format(new Date(entry.start_time), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {formatTime(entry.duration || 0)}
                      </p>
                      {entry.projects?.hourly_rate && (
                        <p className="text-xs text-gray-500">
                          ${((entry.duration || 0) / 3600 * entry.projects.hourly_rate).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity Timeline</h2>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {activityTimeline.length === 0 ? (
              <div className="py-8 text-center text-gray-500 text-sm">
                No activity found
              </div>
            ) : (
              activityTimeline.map((item) => (
                <div key={item.id} className="flex items-start space-x-4">
                  <div 
                    className="flex-shrink-0 w-2 h-2 rounded-full mt-2"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{item.title}</p>
                    {item.description && (
                      <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                    )}
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="text-xs text-gray-400">
                        {format(new Date(item.time), 'MMM dd, yyyy HH:mm')}
                      </span>
                      <span className="text-xs text-gray-400">{formatTime(item.duration || 0)}</span>
                      {item.client && (
                        <span className="text-xs text-gray-400">Client: {item.client}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">User Information</h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="text-sm font-medium text-gray-900">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Full Name</p>
                  <p className="text-sm font-medium text-gray-900">{user.full_name || '—'}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Shield className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Role</p>
                  <p className="text-sm font-medium text-gray-900 capitalize">{user.role}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Account Created</p>
                  <p className="text-sm font-medium text-gray-900">
                    {format(new Date(user.created_at), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
            <div className="space-y-3">
              <button
                onClick={() => setShowDeleteModal(true)}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete User</span>
              </button>
        </div>
      </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Admin Actions</h2>
                </div>
            <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
              {adminActions.length === 0 ? (
                <div className="py-4 text-center text-gray-500 text-sm">
                  No admin actions
                </div>
              ) : (
                adminActions.map((action) => (
                  <div key={action.id} className="py-3">
                    <p className="text-xs font-medium text-gray-900 capitalize">
                      {action.action.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {format(new Date(action.created_at), 'MMM dd, yyyy HH:mm')}
                    </p>
                </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => setShowDeleteModal(false)}
            />
            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Delete User</h3>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to delete <strong>{user.email}</strong>? This action cannot
                be undone and will permanently delete the user account and all associated data.
                </p>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                  type="button"
                    onClick={handleDelete}
                    disabled={actionLoading}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                  {actionLoading ? 'Deleting...' : 'Delete'}
                  </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
