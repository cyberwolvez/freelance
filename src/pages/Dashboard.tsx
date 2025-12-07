import React, { useEffect, useState } from 'react';
import { Clock, Play, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTimer } from '../contexts/TimerContext';

const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { startTimer } = useTimer();
  const [stats, setStats] = useState({
    todayTime: 0,
    weekTime: 0,
    monthTime: 0,
    totalEarnings: 0,
  });
  const [recentEntries, setRecentEntries] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      const today = new Date();
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
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (timeEntries) {
        const todayEntries = timeEntries.filter(entry => 
          new Date(entry.start_time).toDateString() === today.toDateString()
        );
        const weekEntries = timeEntries.filter(entry => 
          new Date(entry.start_time) >= weekStart && new Date(entry.start_time) <= weekEnd
        );
        const monthEntries = timeEntries.filter(entry => 
          new Date(entry.start_time) >= monthStart && new Date(entry.start_time) <= monthEnd
        );

        const todayTime = todayEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
        const weekTime = weekEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
        const monthTime = monthEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
        const totalEarnings = timeEntries.reduce((sum, entry) => {
          const rate = entry.projects?.hourly_rate || 0;
          const hours = (entry.duration || 0) / 3600;
          return sum + (rate * hours);
        }, 0);

        setStats({
          todayTime,
          weekTime,
          monthTime,
          totalEarnings,
        });
        setRecentEntries(timeEntries.slice(0, 5));
        const chartData = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dayEntries = timeEntries.filter(entry => 
            new Date(entry.start_time).toDateString() === date.toDateString()
          );
          const dayTime = dayEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
          chartData.push({
            date: format(date, 'MMM dd'),
            hours: Math.round((dayTime / 3600) * 10) / 10,
          });
        }
        setChartData(chartData);
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
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name');

      if (projectsData) {
        setProjects(projectsData);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickStart = async (projectId: string) => {
    await startTimer(projectId, 'Quick start from dashboard');
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's your time tracking overview.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Today</h3>
          <p className="text-2xl font-bold text-gray-900">{formatTime(stats.todayTime)}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-teal-50 p-3 rounded-lg">
              <Calendar className="h-6 w-6 text-teal-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">This Week</h3>
          <p className="text-2xl font-bold text-gray-900">{formatTime(stats.weekTime)}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-50 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">This Month</h3>
          <p className="text-2xl font-bold text-gray-900">{formatTime(stats.monthTime)}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-amber-50 p-3 rounded-lg">
              <DollarSign className="h-6 w-6 text-amber-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Total Earnings</h3>
          <p className="text-2xl font-bold text-gray-900">${stats.totalEarnings.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Time Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Time Tracked (Last 7 Days)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
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

        {/* Quick Start */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Start</h2>
          <div className="space-y-3">
            {projects.slice(0, 5).map((project) => (
              <button
                key={project.id}
                onClick={() => handleQuickStart(project.id)}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">{project.name}</p>
                    {project.clients && (
                      <p className="text-xs text-gray-500">{project.clients.name}</p>
                    )}
                  </div>
                </div>
                <Play className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Entries */}
      {recentEntries.length > 0 && (
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Recent Time Entries</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {recentEntries.map((entry) => (
              <div key={entry.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: entry.projects?.color || '#3B82F6' }}
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{entry.projects?.name}</p>
                      {entry.description && (
                        <p className="text-xs text-gray-500">{entry.description}</p>
                      )}
                      {entry.projects?.clients && (
                        <p className="text-xs text-gray-500">{entry.projects.clients.name}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {formatTime(entry.duration || 0)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(entry.start_time), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};