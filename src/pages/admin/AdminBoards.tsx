import React, { useState, useEffect } from 'react';
import { Search, Eye, User, Calendar, Trash2, FolderOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Board {
  id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
  user_id: string;
  user: {
    id: string;
    email: string;
    full_name: string | null;
  };
  task_count?: number;
}

export const AdminBoards: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [boards, setBoards] = useState<Board[]>([]);
  const [filteredBoards, setFilteredBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [users, setUsers] = useState<any[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    filterBoards();
  }, [boards, searchQuery, userFilter]);

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
      console.log('Fetching boards as admin...');
      const { data: boardsData, error: boardsError } = await supabase
        .from('boards')
        .select('id, name, description, color, created_at, user_id')
        .order('created_at', { ascending: false });

      if (boardsError) {
        console.error('Error fetching boards:', boardsError);
        console.error('Error details:', JSON.stringify(boardsError, null, 2));
        alert(`Error fetching boards: ${boardsError.message}\n\nCheck console for details.`);
        setBoards([]);
        setLoading(false);
        return;
      }

      console.log('Raw boards data:', boardsData);
      console.log('Fetched boards count:', boardsData?.length || 0);

      if (!boardsData || boardsData.length === 0) {
        console.warn('No boards returned from query. This might be an RLS policy issue.');
        setBoards([]);
        setLoading(false);
        return;
      }
      const userIds = [...new Set(boardsData.map(b => b.user_id).filter(Boolean))];
      console.log('User IDs to fetch:', userIds);
      
      let profilesMap = new Map();
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        } else {
          console.log('Fetched profiles:', profilesData?.length || 0);
          profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
        }
      }

      const boardsWithUsers = boardsData.map(board => ({
        ...board,
        user: profilesMap.get(board.user_id) || { 
          id: board.user_id, 
          email: 'Unknown User', 
          full_name: null 
        },
      }));

      console.log('Boards with users:', boardsWithUsers.length);
      const boardsWithCounts = await Promise.all(
        boardsWithUsers.map(async (board) => {
          try {
            const { count, error } = await supabase
              .from('tasks')
              .select('*', { count: 'exact', head: true })
              .eq('board_id', board.id);
            if (error) {
              console.error(`Error counting tasks for board ${board.id}:`, error);
              return { ...board, task_count: 0 };
            }
            return { ...board, task_count: count || 0 };
          } catch (error) {
            console.error('Error in task count promise:', error);
            return { ...board, task_count: 0 };
          }
        })
      );

      console.log('Final boards with counts:', boardsWithCounts.length);
      setBoards(boardsWithCounts);
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .order('email', { ascending: true });

      if (usersError) {
        console.error('Error fetching users:', usersError);
      } else {
        setUsers(usersData || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setBoards([]);
    } finally {
      setLoading(false);
    }
  };

  const filterBoards = () => {
    let filtered = boards.filter(b => b && b.id); // Filter out any invalid boards

    if (searchQuery) {
      filtered = filtered.filter(b =>
        b.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (userFilter !== 'all') {
      filtered = filtered.filter(b => b.user_id === userFilter);
    }

    setFilteredBoards(filtered);
  };

  const handleDelete = async () => {
    if (!selectedBoard) return;

    try {
      const { error } = await supabase
        .from('boards')
        .delete()
        .eq('id', selectedBoard.id);

      if (error) throw error;

      await fetchData();
      setShowDeleteModal(false);
      setSelectedBoard(null);
    } catch (error) {
      console.error('Error deleting board:', error);
      alert('Failed to delete board');
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">All Boards</h1>
        <p className="text-gray-600">View and manage all user boards across the system</p>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search boards..."
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBoards.map((board) => (
          <div
            key={board.id}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3 flex-1">
                <div
                  className="w-4 h-4 rounded flex-shrink-0"
                  style={{ backgroundColor: board.color }}
                ></div>
                <h3 className="text-lg font-semibold text-gray-900 truncate">{board.name}</h3>
              </div>
            </div>

            {board.description && (
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{board.description}</p>
            )}

            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-gray-600">
                <User className="h-4 w-4 mr-2 text-gray-400" />
                <span className="truncate">{board.user?.full_name || board.user?.email || 'Unknown User'}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <FolderOpen className="h-4 w-4 mr-2 text-gray-400" />
                <span>{board.task_count || 0} tasks</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                <span>{format(new Date(board.created_at), 'MMM dd, yyyy')}</span>
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => navigate(`/admin/users/${board.user_id}`)}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Eye className="h-4 w-4" />
                <span>View User</span>
              </button>
              <button
                onClick={() => {
                  setSelectedBoard(board);
                  setShowDeleteModal(true);
                }}
                className="px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredBoards.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No boards found</p>
        </div>
      )}

      {showDeleteModal && selectedBoard && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedBoard(null);
              }}
            />
            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Board</h3>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to delete <strong>{selectedBoard.name}</strong>? This will also delete all tasks in this board. This action cannot be undone.
              </p>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedBoard(null);
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

