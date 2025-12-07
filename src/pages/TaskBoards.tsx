import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Calendar, User, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { logActivity } from '../lib/activityLogger';

interface Board {
  id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
}

interface Task {
  id: string;
  board_id: string;
  title: string;
  description: string | null;
  status: 'to_do' | 'in_progress' | 'done';
  due_date: string | null;
  assigned_to: string | null;
  position: number;
  created_at: string;
  assigned_user?: {
    id: string;
    email: string;
    full_name: string | null;
  };
}

const STATUSES = [
  { value: 'to_do', label: 'To-Do', color: 'bg-gray-100 text-gray-800' },
  { value: 'in_progress', label: 'In-Progress', color: 'bg-blue-100 text-blue-800' },
  { value: 'done', label: 'Done', color: 'bg-green-100 text-green-800' },
];

export const TaskBoards: React.FC = () => {
  const { user } = useAuth();
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBoardModal, setShowBoardModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [boardFormData, setBoardFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
  });
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    status: 'to_do' as 'to_do' | 'in_progress' | 'done',
    due_date: '',
    assigned_to: '',
  });

  const colorOptions = [
    '#3B82F6', '#14B8A6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1', '#EAB308'
  ];

  useEffect(() => {
    if (user) {
      fetchBoards();
    }
  }, [user]);

  useEffect(() => {
    if (selectedBoard) {
      fetchTasks(selectedBoard.id);
    }
  }, [selectedBoard]);

  const fetchBoards = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('boards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBoards(data || []);
      if (data && data.length > 0 && !selectedBoard) {
        setSelectedBoard(data[0]);
      }
    } catch (error) {
      console.error('Error fetching boards:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async (boardId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assigned_user:profiles!tasks_assigned_to_fkey(id, email, full_name)
        `)
        .eq('board_id', boardId)
        .order('position', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const handleCreateBoard = async () => {
    if (!user || !boardFormData.name.trim()) return;

    try {
      const { data, error } = await supabase
        .from('boards')
        .insert([{
          user_id: user.id,
          name: boardFormData.name,
          description: boardFormData.description || null,
          color: boardFormData.color,
        }])
        .select()
        .single();

      if (error) throw error;

      await logActivity({
        action: 'created_board',
        entityType: 'board',
        entityId: data.id,
        details: { boardName: data.name },
      });

      await fetchBoards();
      setSelectedBoard(data);
      setShowBoardModal(false);
      setBoardFormData({ name: '', description: '', color: '#3B82F6' });
    } catch (error) {
      console.error('Error creating board:', error);
      alert('Failed to create board');
    }
  };

  const handleUpdateBoard = async () => {
    if (!editingBoard || !boardFormData.name.trim()) return;

    try {
      const { error } = await supabase
        .from('boards')
        .update({
          name: boardFormData.name,
          description: boardFormData.description || null,
          color: boardFormData.color,
        })
        .eq('id', editingBoard.id);

      if (error) throw error;

      await logActivity({
        action: 'updated_board',
        entityType: 'board',
        entityId: editingBoard.id,
        details: { boardName: boardFormData.name },
      });

      await fetchBoards();
      if (selectedBoard?.id === editingBoard.id) {
        setSelectedBoard({ ...editingBoard, ...boardFormData });
      }
      setShowBoardModal(false);
      setEditingBoard(null);
      setBoardFormData({ name: '', description: '', color: '#3B82F6' });
    } catch (error) {
      console.error('Error updating board:', error);
      alert('Failed to update board');
    }
  };

  const handleDeleteBoard = async (boardId: string) => {
    if (!confirm('Are you sure you want to delete this board? All tasks will be deleted.')) return;

    try {
      const { error } = await supabase
        .from('boards')
        .delete()
        .eq('id', boardId);

      if (error) throw error;

      await logActivity({
        action: 'deleted_board',
        entityType: 'board',
        entityId: boardId,
      });

      await fetchBoards();
      if (selectedBoard?.id === boardId) {
        setSelectedBoard(boards.find(b => b.id !== boardId) || null);
      }
    } catch (error) {
      console.error('Error deleting board:', error);
      alert('Failed to delete board');
    }
  };

  const handleCreateTask = async () => {
    if (!user || !selectedBoard || !taskFormData.title.trim()) return;

    try {
      const maxPosition = tasks.length > 0 
        ? Math.max(...tasks.map(t => t.position || 0)) 
        : 0;

      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          board_id: selectedBoard.id,
          user_id: user.id,
          title: taskFormData.title,
          description: taskFormData.description || null,
          status: taskFormData.status,
          due_date: taskFormData.due_date || null,
          assigned_to: taskFormData.assigned_to || null,
          position: maxPosition + 1,
        }])
        .select()
        .single();

      if (error) throw error;

      await logActivity({
        action: 'created_task',
        entityType: 'task',
        entityId: data.id,
        details: { taskTitle: data.title, boardId: selectedBoard.id },
      });

      await fetchTasks(selectedBoard.id);
      setShowTaskModal(false);
      setTaskFormData({ title: '', description: '', status: 'to_do', due_date: '', assigned_to: '' });
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task');
    }
  };

  const handleUpdateTask = async () => {
    if (!editingTask || !taskFormData.title.trim()) return;

    try {
      const oldStatus = editingTask.status;
      const { error } = await supabase
        .from('tasks')
        .update({
          title: taskFormData.title,
          description: taskFormData.description || null,
          status: taskFormData.status,
          due_date: taskFormData.due_date || null,
          assigned_to: taskFormData.assigned_to || null,
        })
        .eq('id', editingTask.id);

      if (error) throw error;

      await logActivity({
        action: oldStatus !== taskFormData.status 
          ? `updated_task_status_from_${oldStatus}_to_${taskFormData.status}`
          : 'updated_task',
        entityType: 'task',
        entityId: editingTask.id,
        details: { 
          taskTitle: taskFormData.title,
          oldStatus,
          newStatus: taskFormData.status,
        },
      });

      await fetchTasks(editingTask.board_id);
      setShowTaskModal(false);
      setEditingTask(null);
      setTaskFormData({ title: '', description: '', status: 'to_do', due_date: '', assigned_to: '' });
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId: string, boardId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      await logActivity({
        action: 'deleted_task',
        entityType: 'task',
        entityId: taskId,
      });

      await fetchTasks(boardId);
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task');
    }
  };

  const handleStatusChange = async (task: Task, newStatus: 'to_do' | 'in_progress' | 'done') => {
    if (task.status === newStatus) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', task.id);

      if (error) throw error;

      await logActivity({
        action: `updated_task_status_from_${task.status}_to_${newStatus}`,
        entityType: 'task',
        entityId: task.id,
        details: { 
          taskTitle: task.title,
          oldStatus: task.status,
          newStatus,
        },
      });

      await fetchTasks(task.board_id);
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (status: 'to_do' | 'in_progress' | 'done') => {
    if (!draggedTask) return;

    await handleStatusChange(draggedTask, status);
    setDraggedTask(null);
  };

  const openTaskModal = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setTaskFormData({
        title: task.title,
        description: task.description || '',
        status: task.status,
        due_date: task.due_date ? format(new Date(task.due_date), "yyyy-MM-dd'T'HH:mm") : '',
        assigned_to: task.assigned_to || '',
      });
    } else {
      setEditingTask(null);
      setTaskFormData({ title: '', description: '', status: 'to_do', due_date: '', assigned_to: '' });
    }
    setShowTaskModal(true);
  };

  const openBoardModal = (board?: Board) => {
    if (board) {
      setEditingBoard(board);
      setBoardFormData({
        name: board.name,
        description: board.description || '',
        color: board.color,
      });
    } else {
      setEditingBoard(null);
      setBoardFormData({ name: '', description: '', color: '#3B82F6' });
    }
    setShowBoardModal(true);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Task Boards</h1>
          <p className="text-gray-600">Manage your tasks with Kanban-style boards</p>
        </div>
        <div className="flex items-center space-x-3">
          {boards.length > 0 && (
            <select
              value={selectedBoard?.id || ''}
              onChange={(e) => {
                const board = boards.find(b => b.id === e.target.value);
                setSelectedBoard(board || null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {boards.map(board => (
                <option key={board.id} value={board.id}>{board.name}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => openBoardModal()}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>New Board</span>
          </button>
        </div>
      </div>

      {boards.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-gray-600 mb-4">No boards yet. Create your first board to get started!</p>
          <button
            onClick={() => openBoardModal()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Board
          </button>
        </div>
      ) : selectedBoard ? (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: selectedBoard.color }}
                ></div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedBoard.name}</h2>
                <button
                  onClick={() => openBoardModal(selectedBoard)}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteBoard(selectedBoard.id)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <button
                onClick={() => openTaskModal()}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-5 w-5" />
                <span>New Task</span>
              </button>
            </div>
            {selectedBoard.description && (
              <p className="text-gray-600 mb-4">{selectedBoard.description}</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              {STATUSES.map((status) => {
                const statusTasks = tasks.filter(t => t.status === status.value);
                return (
                  <div
                    key={status.value}
                    className="bg-gray-50 rounded-lg p-4 min-h-[400px]"
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(status.value as 'to_do' | 'in_progress' | 'done')}
                  >
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-4 ${status.color}`}>
                      {status.label}
                      <span className="ml-2 text-xs">({statusTasks.length})</span>
                    </div>
                    <div className="space-y-3">
                      {statusTasks.map((task) => (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={() => handleDragStart(task)}
                          className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-move"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-medium text-gray-900 flex-1">{task.title}</h3>
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => openTaskModal(task)}
                                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteTask(task.id, task.board_id)}
                                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          {task.description && (
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>
                          )}
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            {task.due_date && (
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-3 w-3" />
                                <span>{format(new Date(task.due_date), 'MMM dd, yyyy')}</span>
                              </div>
                            )}
                            {task.assigned_user && (
                              <div className="flex items-center space-x-1">
                                <User className="h-3 w-3" />
                                <span>{task.assigned_user.full_name || task.assigned_user.email}</span>
                              </div>
                            )}
                          </div>
                          <div className="mt-3 flex space-x-2">
                            {STATUSES.filter(s => s.value !== task.status).map((s) => (
                              <button
                                key={s.value}
                                onClick={() => handleStatusChange(task, s.value as 'to_do' | 'in_progress' | 'done')}
                                className={`text-xs px-2 py-1 rounded ${s.color} hover:opacity-80 transition-opacity`}
                              >
                                Move to {s.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                      {statusTasks.length === 0 && (
                        <div className="text-center text-gray-400 text-sm py-8">
                          No tasks
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {showBoardModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => {
                setShowBoardModal(false);
                setEditingBoard(null);
                setBoardFormData({ name: '', description: '', color: '#3B82F6' });
              }}
            />
            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingBoard ? 'Edit Board' : 'Create Board'}
                </h3>
                <button
                  onClick={() => {
                    setShowBoardModal(false);
                    setEditingBoard(null);
                    setBoardFormData({ name: '', description: '', color: '#3B82F6' });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={boardFormData.name}
                    onChange={(e) => setBoardFormData({ ...boardFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Board name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={boardFormData.description}
                    onChange={(e) => setBoardFormData({ ...boardFormData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Board description"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                  <div className="flex flex-wrap gap-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color}
                        onClick={() => setBoardFormData({ ...boardFormData, color })}
                        className={`w-8 h-8 rounded-full border-2 ${
                          boardFormData.color === color ? 'border-gray-900' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowBoardModal(false);
                      setEditingBoard(null);
                      setBoardFormData({ name: '', description: '', color: '#3B82F6' });
                    }}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editingBoard ? handleUpdateBoard : handleCreateBoard}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingBoard ? 'Update' : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTaskModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => {
                setShowTaskModal(false);
                setEditingTask(null);
                setTaskFormData({ title: '', description: '', status: 'to_do', due_date: '', assigned_to: '' });
              }}
            />
            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingTask ? 'Edit Task' : 'Create Task'}
                </h3>
                <button
                  onClick={() => {
                    setShowTaskModal(false);
                    setEditingTask(null);
                    setTaskFormData({ title: '', description: '', status: 'to_do', due_date: '', assigned_to: '' });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={taskFormData.title}
                    onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Task title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={taskFormData.description}
                    onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Task description"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={taskFormData.status}
                    onChange={(e) => setTaskFormData({ ...taskFormData, status: e.target.value as 'to_do' | 'in_progress' | 'done' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {STATUSES.map(status => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="datetime-local"
                    value={taskFormData.due_date}
                    onChange={(e) => setTaskFormData({ ...taskFormData, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowTaskModal(false);
                      setEditingTask(null);
                      setTaskFormData({ title: '', description: '', status: 'to_do', due_date: '', assigned_to: '' });
                    }}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editingTask ? handleUpdateTask : handleCreateTask}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingTask ? 'Update' : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


