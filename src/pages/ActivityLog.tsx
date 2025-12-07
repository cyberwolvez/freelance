import React, { useState, useEffect } from 'react';
import { Activity, Calendar, User, CheckCircle, XCircle, Edit, Trash2, Plus, FolderOpen, Clock, Settings, Lock, Play, Square } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ActivityLogEntry {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, any>;
  created_at: string;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  created_board: <Plus className="h-4 w-4 text-blue-600" />,
  updated_board: <Edit className="h-4 w-4 text-blue-600" />,
  deleted_board: <Trash2 className="h-4 w-4 text-red-600" />,
  created_task: <Plus className="h-4 w-4 text-green-600" />,
  updated_task: <Edit className="h-4 w-4 text-blue-600" />,
  deleted_task: <Trash2 className="h-4 w-4 text-red-600" />,
  updated_task_status_from_to_do_to_in_progress: <CheckCircle className="h-4 w-4 text-blue-600" />,
  updated_task_status_from_in_progress_to_done: <CheckCircle className="h-4 w-4 text-green-600" />,
  updated_task_status_from_to_do_to_done: <CheckCircle className="h-4 w-4 text-green-600" />,
  updated_task_status_from_in_progress_to_to_do: <XCircle className="h-4 w-4 text-gray-600" />,
  updated_task_status_from_done_to_in_progress: <XCircle className="h-4 w-4 text-blue-600" />,
  updated_task_status_from_done_to_to_do: <XCircle className="h-4 w-4 text-gray-600" />,
  created_project: <FolderOpen className="h-4 w-4 text-purple-600" />,
  updated_project: <Edit className="h-4 w-4 text-purple-600" />,
  deleted_project: <Trash2 className="h-4 w-4 text-red-600" />,
  activated_project: <CheckCircle className="h-4 w-4 text-green-600" />,
  deactivated_project: <XCircle className="h-4 w-4 text-gray-600" />,
  created_client: <User className="h-4 w-4 text-indigo-600" />,
  updated_client: <Edit className="h-4 w-4 text-indigo-600" />,
  deleted_client: <Trash2 className="h-4 w-4 text-red-600" />,
  started_timer: <Play className="h-4 w-4 text-green-600" />,
  stopped_timer: <Square className="h-4 w-4 text-red-600" />,
  created_time_entry: <Clock className="h-4 w-4 text-blue-600" />,
  updated_time_entry: <Edit className="h-4 w-4 text-blue-600" />,
  deleted_time_entry: <Trash2 className="h-4 w-4 text-red-600" />,
  updated_profile: <Settings className="h-4 w-4 text-gray-600" />,
  changed_password: <Lock className="h-4 w-4 text-gray-600" />,
};

const ACTION_LABELS: Record<string, string> = {
  created_board: 'Created Board',
  updated_board: 'Updated Board',
  deleted_board: 'Deleted Board',
  created_task: 'Created Task',
  updated_task: 'Updated Task',
  deleted_task: 'Deleted Task',
  updated_task_status_from_to_do_to_in_progress: 'Moved Task to In-Progress',
  updated_task_status_from_in_progress_to_done: 'Completed Task',
  updated_task_status_from_to_do_to_done: 'Completed Task',
  updated_task_status_from_in_progress_to_to_do: 'Moved Task to To-Do',
  updated_task_status_from_done_to_in_progress: 'Reopened Task',
  updated_task_status_from_done_to_to_do: 'Moved Task to To-Do',
  created_project: 'Created Project',
  updated_project: 'Updated Project',
  deleted_project: 'Deleted Project',
  activated_project: 'Activated Project',
  deactivated_project: 'Deactivated Project',
  created_client: 'Created Client',
  updated_client: 'Updated Client',
  deleted_client: 'Deleted Client',
  started_timer: 'Started Timer',
  stopped_timer: 'Stopped Timer',
  created_time_entry: 'Created Time Entry',
  updated_time_entry: 'Updated Time Entry',
  deleted_time_entry: 'Deleted Time Entry',
  updated_profile: 'Updated Profile',
  changed_password: 'Changed Password',
};

const formatAction = (action: string, details: Record<string, any>): string => {
  if (ACTION_LABELS[action]) {
    let label = ACTION_LABELS[action];
    if (details.boardName) {
      label += `: "${details.boardName}"`;
    }
    if (details.taskTitle) {
      label += `: "${details.taskTitle}"`;
    }
    if (details.projectName) {
      label += `: "${details.projectName}"`;
    }
    if (details.clientName) {
      label += `: "${details.clientName}"`;
    }
    return label;
  }

  return action
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const ActivityLog: React.FC = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'boards' | 'tasks' | 'projects' | 'clients' | 'time' | 'settings'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    if (user) {
      fetchActivities();
    }
  }, [user, filter]);

  const fetchActivities = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(itemsPerPage * currentPage);

      if (filter === 'boards') {
        query = query.eq('entity_type', 'board');
      } else if (filter === 'tasks') {
        query = query.eq('entity_type', 'task');
      } else if (filter === 'projects') {
        query = query.eq('entity_type', 'project');
      } else if (filter === 'clients') {
        query = query.eq('entity_type', 'client');
      } else if (filter === 'time') {
        query = query.in('action', ['started_timer', 'stopped_timer', 'created_time_entry', 'updated_time_entry', 'deleted_time_entry']);
      } else if (filter === 'settings') {
        query = query.in('action', ['updated_profile', 'changed_password']);
      }

      const { data, error } = await query;

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    setCurrentPage(prev => prev + 1);
    fetchActivities();
  };

  const filteredActivities = activities.slice(0, currentPage * itemsPerPage);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Activity Log</h1>
        <p className="text-gray-600">Track all your system activities and changes</p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          onClick={() => {
            setFilter('all');
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Activities
        </button>
        <button
          onClick={() => {
            setFilter('boards');
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'boards'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Boards
        </button>
        <button
          onClick={() => {
            setFilter('tasks');
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'tasks'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Tasks
        </button>
        <button
          onClick={() => {
            setFilter('projects');
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'projects'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Projects
        </button>
        <button
          onClick={() => {
            setFilter('clients');
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'clients'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Clients
        </button>
        <button
          onClick={() => {
            setFilter('time');
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'time'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Time Tracking
        </button>
        <button
          onClick={() => {
            setFilter('settings');
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'settings'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Settings
        </button>
      </div>

      <div className="space-y-4">
        {filteredActivities.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No activities found</p>
          </div>
        ) : (
          filteredActivities.map((activity) => {
            const icon = ACTION_ICONS[activity.action] || <Activity className="h-4 w-4 text-gray-600" />;
            const label = formatAction(activity.action, activity.details || {});

            return (
              <div
                key={activity.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 mt-1">
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">{label}</p>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />
                        <span>{format(new Date(activity.created_at), 'MMM dd, yyyy HH:mm')}</span>
                      </div>
                    </div>
                    {activity.details && Object.keys(activity.details).length > 0 && (
                      <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                        {Object.entries(activity.details)
                          .filter(([key]) => !['boardId', 'taskId', 'board_id', 'task_id', 'clientId', 'client_id', 'projectId', 'project_id'].includes(key))
                          .map(([key, value]) => (
                            <div key={key} className="mb-1">
                              <span className="font-medium">{key}:</span> {String(value)}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {activities.length > filteredActivities.length && (
          <div className="text-center pt-4">
            <button
              onClick={loadMore}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
