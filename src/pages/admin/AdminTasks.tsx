import React, { useState, useEffect } from 'react';
import { Search, Eye, User, Calendar, Trash2, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'to_do' | 'in_progress' | 'done';
  due_date: string | null;
  created_at: string;
  board_id: string;
  user_id: string;
  user: {
    id: string;
    email: string;
    full_name: string | null;
  };
  board: {
    id: string;
    name: string;
    color: string;
  };
}

const STATUS_COLORS = {
  to_do: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  done: 'bg-green-100 text-green-800',
};

export const AdminTasks: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [users, setUsers] = useState<any[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    filterTasks();
  }, [tasks, searchQuery, userFilter, statusFilter]);

  const fetchData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      console.log('Current user profile:', profileData);
      console.log('Is admin?', profileData?.role === 'admin');
      
      if (profileError) {
        console.error('Error checking admin status:', profileError);
      }
      console.log('Fetching tasks as admin...');
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('id, title, description, status, due_date, created_at, board_id, user_id, assigned_to')
        .order('created_at', { ascending: false })
        .limit(500);

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
        console.error('Error details:', JSON.stringify(tasksError, null, 2));
        alert(`Error fetching tasks: ${tasksError.message}\n\nCheck console for details.`);
        setTasks([]);
        setLoading(false);
        return;
      }

      console.log('Raw tasks data:', tasksData);
      console.log('Fetched tasks count:', tasksData?.length || 0);

      if (!tasksData || tasksData.length === 0) {
        console.warn('No tasks returned from query. This might be an RLS policy issue.');
        setTasks([]);
        setLoading(false);
        return;
      }
      const userIds = [...new Set(tasksData.map(t => t.user_id).filter(Boolean))];
      const boardIds = [...new Set(tasksData.map(t => t.board_id).filter(Boolean))];
      console.log('User IDs to fetch:', userIds);
      console.log('Board IDs to fetch:', boardIds);
      let usersMap = new Map();
      let boardsMap = new Map();

      if (userIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds);

        if (usersError) {
          console.error('Error fetching users:', usersError);
        } else {
          console.log('Fetched users:', usersData?.length || 0);
          usersMap = new Map(usersData?.map(u => [u.id, u]) || []);
        }
      }

      if (boardIds.length > 0) {
        const { data: boardsData, error: boardsError } = await supabase
          .from('boards')
          .select('id, name, color')
          .in('id', boardIds);

        if (boardsError) {
          console.error('Error fetching boards:', boardsError);
        } else {
          console.log('Fetched boards:', boardsData?.length || 0);
          boardsMap = new Map(boardsData?.map(b => [b.id, b]) || []);
        }
      }
      const normalizedTasks = tasksData.map((task: any) => ({
        ...task,
        user: usersMap.get(task.user_id) || { 
          id: task.user_id, 
          email: 'Unknown User', 
          full_name: null 
        },
        board: boardsMap.get(task.board_id) || { 
          id: task.board_id, 
          name: 'Unknown Board', 
          color: '#6B7280' 
        }
      }));

      console.log('Normalized tasks:', normalizedTasks.length);
      setTasks(normalizedTasks);
      const { data: allUsersData, error: allUsersError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .order('email', { ascending: true });

      if (allUsersError) {
        console.error('Error fetching all users:', allUsersError);
      } else {
        setUsers(allUsersData || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const filterTasks = () => {
    let filtered = tasks.filter(t => t && t.id); // Filter out any invalid tasks

    if (searchQuery) {
      filtered = filtered.filter(t =>
        t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.board?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (userFilter !== 'all') {
      filtered = filtered.filter(t => t.user_id === userFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    setFilteredTasks(filtered);
  };

  const handleDelete = async () => {
    if (!selectedTask) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', selectedTask.id);

      if (error) throw error;

      await fetchData();
      setShowDeleteModal(false);
      setSelectedTask(null);
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task');
    }
  };

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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">All Tasks</h1>
        <p className="text-gray-600">View and manage all tasks across all user boards</p>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Users</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>
              {u.full_name || u.email}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Statuses</option>
          <option value="to_do">To-Do</option>
          <option value="in_progress">In-Progress</option>
          <option value="done">Done</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Task
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Board
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{task.title}</p>
                      {task.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">{task.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {task.board && (
                        <>
                          <div
                            className="w-3 h-3 rounded mr-2"
                            style={{ backgroundColor: task.board.color || '#6B7280' }}
                          ></div>
                          <span className="text-sm text-gray-900">{task.board.name || 'Unknown Board'}</span>
                        </>
                      )}
                      {!task.board && (
                        <span className="text-sm text-gray-400">No Board</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900 truncate max-w-[150px]">
                        {task.user?.full_name || task.user?.email || 'Unknown User'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[task.status]}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {task.due_date ? (
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {format(new Date(task.due_date), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => navigate(`/admin/users/${task.user_id}`)}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedTask(task);
                          setShowDeleteModal(true);
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredTasks.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No tasks found</p>
        </div>
      )}

      {showDeleteModal && selectedTask && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedTask(null);
              }}
            />
            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Task</h3>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to delete <strong>{selectedTask.title}</strong>? This action cannot be undone.
              </p>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedTask(null);
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


