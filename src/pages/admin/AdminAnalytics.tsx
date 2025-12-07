import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Clock, DollarSign, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const COLORS = ['#3B82F6', '#8B5CF6', '#14B8A6', '#F59E0B', '#EF4444', '#10B981'];

export const AdminAnalytics: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalProjects: 0,
    totalClients: 0,
    totalTimeEntries: 0,
    totalHours: 0,
    totalEarnings: 0,
  });
  const [userActivityData, setUserActivityData] = useState<any[]>([]);
  const [projectDistribution, setProjectDistribution] = useState<any[]>([]);
  const [timeTrendData, setTimeTrendData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user]);

  const fetchAnalytics = async () => {
    if (!user) return;

    try {
      const { data: profiles } = await supabase.from('profiles').select('id, created_at');
      const { data: projects } = await supabase.from('projects').select('id, user_id, name');
      const { data: clients } = await supabase.from('clients').select('id, user_id');
      const { data: timeEntries } = await supabase
        .from('time_entries')
        .select('id, user_id, duration, start_time, projects(hourly_rate)');

      if (profiles && projects && clients && timeEntries) {
        const totalUsers = profiles.length;
        const activeUsers = new Set(timeEntries.map(e => e.user_id)).size;
        const totalProjects = projects.length;
        const totalClients = clients.length;
        const totalTimeEntries = timeEntries.length;
        const totalHours = timeEntries.reduce((sum, e) => sum + (e.duration || 0), 0) / 3600;
        const totalEarnings = timeEntries.reduce((sum, e) => {
          const rate = (e.projects as any)?.hourly_rate || 0;
          const hours = (e.duration || 0) / 3600;
          return sum + (rate * hours);
        }, 0);

        setStats({
          totalUsers,
          activeUsers,
          totalProjects,
          totalClients,
          totalTimeEntries,
          totalHours: Math.round(totalHours * 10) / 10,
          totalEarnings: Math.round(totalEarnings * 100) / 100,
        });

        const userActivity = timeEntries.reduce((acc: any, entry: any) => {
          if (!acc[entry.user_id]) {
            acc[entry.user_id] = { userId: entry.user_id, hours: 0, entries: 0 };
          }
          acc[entry.user_id].hours += (entry.duration || 0) / 3600;
          acc[entry.user_id].entries += 1;
          return acc;
        }, {});

        const { data: allProfiles } = await supabase.from('profiles').select('id, email, full_name');
        const activityData = Object.values(userActivity)
          .map((activity: any) => {
            const profile = allProfiles?.find((p: any) => p.id === activity.userId);
            return {
              name: profile?.full_name || profile?.email || 'Unknown',
              hours: Math.round(activity.hours * 10) / 10,
              entries: activity.entries,
            };
          })
          .sort((a: any, b: any) => b.hours - a.hours)
          .slice(0, 10);

        setUserActivityData(activityData);

        const projectCounts = projects.reduce((acc: any, p: any) => {
          acc[p.user_id] = (acc[p.user_id] || 0) + 1;
          return acc;
        }, {});

        const projectData = Object.entries(projectCounts)
          .map(([userId, count]: [string, any]) => {
            const profile = allProfiles?.find((p: any) => p.id === userId);
            return {
              name: profile?.full_name || profile?.email || 'Unknown',
              value: count,
            };
          })
          .sort((a, b) => b.value - a.value)
          .slice(0, 6);

        setProjectDistribution(projectData);

        const trendData = [];
        for (let i = 29; i >= 0; i--) {
          const date = subDays(new Date(), i);
          const dateStart = startOfDay(date);
          const dateEnd = endOfDay(date);
          const dayEntries = timeEntries.filter((e: any) => {
            const entryDate = new Date(e.start_time);
            return entryDate >= dateStart && entryDate <= dateEnd;
          });
          const dayHours = dayEntries.reduce((sum: number, e: any) => sum + (e.duration || 0), 0) / 3600;
          trendData.push({
            date: format(date, 'MMM dd'),
            hours: Math.round(dayHours * 10) / 10,
          });
        }
        setTimeTrendData(trendData);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">System Analytics</h1>
        <p className="text-gray-600">Comprehensive analytics and insights across all users</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Total Users</h3>
          <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
          <p className="text-xs text-gray-500 mt-1">{stats.activeUsers} active</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-50 p-3 rounded-lg">
              <Clock className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Total Hours</h3>
          <p className="text-2xl font-bold text-gray-900">{stats.totalHours}h</p>
          <p className="text-xs text-gray-500 mt-1">{stats.totalTimeEntries} entries</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-50 p-3 rounded-lg">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Total Earnings</h3>
          <p className="text-2xl font-bold text-gray-900">${stats.totalEarnings}</p>
          <p className="text-xs text-gray-500 mt-1">Based on rates</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-amber-50 p-3 rounded-lg">
              <BarChart3 className="h-6 w-6 text-amber-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Projects</h3>
          <p className="text-2xl font-bold text-gray-900">{stats.totalProjects}</p>
          <p className="text-xs text-gray-500 mt-1">{stats.totalClients} clients</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Time Tracking Trend (30 Days)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeTrendData}>
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
                <Line type="monotone" dataKey="hours" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Users by Hours</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userActivityData} layout="vertical">
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
                <Bar dataKey="hours" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Distribution by User</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={projectDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(props: any) => `${props.name}: ${props.value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {projectDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

