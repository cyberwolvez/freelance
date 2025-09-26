import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, Clock, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTimer } from '../contexts/TimerContext';

const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const Timer: React.FC = () => {
  const { user } = useAuth();
  const { activeEntry, isRunning, elapsedTime, startTimer, stopTimer, pauseTimer } = useTimer();
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [description, setDescription] = useState('');
  const [recentEntries, setRecentEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch projects
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
        if (projectsData.length > 0 && !selectedProject) {
          setSelectedProject(projectsData[0].id);
        }
      }

      // Fetch recent entries
      const { data: entriesData } = await supabase
        .from('time_entries')
        .select(`
          *,
          projects (
            id,
            name,
            color,
            clients (
              id,
              name
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (entriesData) {
        setRecentEntries(entriesData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    if (!selectedProject) return;
    await startTimer(selectedProject, description);
    setDescription('');
  };

  const handleStop = async () => {
    await stopTimer();
    fetchData(); // Refresh recent entries
  };

  const handlePause = async () => {
    await pauseTimer();
    fetchData(); // Refresh recent entries
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
            <div className="h-32 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Time Tracker</h1>
        <p className="text-gray-600">Track your time across different projects and tasks.</p>
      </div>

      {/* Timer Widget */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mb-8">
        <div className="text-center mb-8">
          <div className="text-6xl font-mono font-bold text-gray-900 mb-4">
            {formatTime(elapsedTime)}
          </div>
          {activeEntry && (
            <div className="flex items-center justify-center space-x-2 text-lg text-gray-600">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: activeEntry.projects?.color || '#3B82F6' }}
              />
              <span>{activeEntry.projects?.name}</span>
              {activeEntry.projects?.clients && (
                <>
                  <span>•</span>
                  <span>{activeEntry.projects.clients.name}</span>
                </>
              )}
            </div>
          )}
        </div>

        {!isRunning ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project
              </label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name} {project.clients ? `(${project.clients.name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What are you working on?"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={handleStart}
              disabled={!selectedProject}
              className="w-full bg-green-600 text-white py-4 px-6 rounded-lg font-medium hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              <Play className="h-5 w-5" />
              <span>Start Timer</span>
            </button>
          </div>
        ) : (
          <div className="flex space-x-4">
            <button
              onClick={handlePause}
              className="flex-1 bg-amber-600 text-white py-4 px-6 rounded-lg font-medium hover:bg-amber-700 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors flex items-center justify-center space-x-2"
            >
              <Pause className="h-5 w-5" />
              <span>Pause</span>
            </button>
            <button
              onClick={handleStop}
              className="flex-1 bg-red-600 text-white py-4 px-6 rounded-lg font-medium hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors flex items-center justify-center space-x-2"
            >
              <Square className="h-5 w-5" />
              <span>Stop</span>
            </button>
          </div>
        )}
      </div>

      {/* Recent Entries */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Recent Time Entries</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {recentEntries.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No time entries yet. Start your first timer!</p>
            </div>
          ) : (
            recentEntries.map((entry) => (
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
                        <p className="text-sm text-gray-600">{entry.description}</p>
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
                      {format(new Date(entry.start_time), 'MMM dd, yyyy HH:mm')}
                    </p>
                    {entry.is_running && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Running
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};