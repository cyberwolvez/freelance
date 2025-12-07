import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Calendar, Clock, Search } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { logActivity } from '../lib/activityLogger';

interface TimeEntry {
  id: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  duration: number;
  is_running: boolean;
  project_id: string;
  project: {
    id: string;
    name: string;
    color: string;
    hourly_rate: number | null;
    clients: {
      id: string;
      name: string;
    } | null;
  } | null;
}

const formatTime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

export const TimeEntries: React.FC = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null);
  const [editFormData, setEditFormData] = useState({
    description: '',
    start_time: '',
    end_time: '',
  });

  useEffect(() => {
    if (user) {
      fetchEntries();
    }
  }, [user]);

  useEffect(() => {
    filterEntries();
  }, [entries, searchQuery]);

  const fetchEntries = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          *,
          project:projects (
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
        .order('start_time', { ascending: false })
        .limit(100);

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterEntries = () => {
    let filtered = entries;

    if (searchQuery) {
      filtered = filtered.filter(e =>
        e.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.project?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.project?.clients?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredEntries(filtered);
  };

  const handleEdit = (entry: TimeEntry) => {
    setSelectedEntry(entry);
    setEditFormData({
      description: entry.description || '',
      start_time: format(new Date(entry.start_time), "yyyy-MM-dd'T'HH:mm"),
      end_time: entry.end_time ? format(new Date(entry.end_time), "yyyy-MM-dd'T'HH:mm") : '',
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!selectedEntry) return;

    try {
      const startTime = new Date(editFormData.start_time);
      const endTime = editFormData.end_time ? new Date(editFormData.end_time) : null;
      const duration = endTime
        ? Math.floor((endTime.getTime() - startTime.getTime()) / 1000)
        : selectedEntry.duration;

      const { error } = await supabase
        .from('time_entries')
        .update({
          description: editFormData.description || null,
          start_time: startTime.toISOString(),
          end_time: endTime?.toISOString() || null,
          duration: duration > 0 ? duration : 0,
          is_running: !endTime,
        })
        .eq('id', selectedEntry.id);

      if (error) throw error;

      await logActivity({
        action: 'updated_time_entry',
        entityType: 'time_entry',
        entityId: selectedEntry.id,
        details: {
          projectName: selectedEntry.project?.name || 'Unknown Project',
          duration: formatTime(duration),
          startTime: editFormData.start_time,
          endTime: editFormData.end_time,
        },
      });

      await fetchEntries();
      setShowEditModal(false);
      setSelectedEntry(null);
    } catch (error) {
      console.error('Error updating entry:', error);
      alert('Failed to update time entry');
    }
  };

  const handleDelete = async () => {
    if (!selectedEntry) return;

    try {
      const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', selectedEntry.id);

      if (error) throw error;

      await logActivity({
        action: 'deleted_time_entry',
        entityType: 'time_entry',
        entityId: selectedEntry.id,
        details: {
          projectName: selectedEntry.project?.name || 'Unknown Project',
          duration: formatTime(selectedEntry.duration),
        },
      });

      await fetchEntries();
      setShowDeleteModal(false);
      setSelectedEntry(null);
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert('Failed to delete time entry');
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Time Entries</h1>
        <p className="text-gray-600">View, edit, and manage your time tracking entries</p>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search entries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filteredEntries.map((entry) => (
          <div
            key={entry.id}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  {entry.project ? (
                    <>
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: entry.project?.color || '#3B82F6' }}
                      ></div>
                      <h3 className="text-lg font-semibold text-gray-900">{entry.project.name || 'Unknown Project'}</h3>
                      {entry.project.clients && (
                        <span className="text-sm text-gray-500">• {entry.project.clients.name}</span>
                      )}
                    </>
                  ) : (
                    <h3 className="text-lg font-semibold text-gray-900">Unknown Project</h3>
                  )}
                </div>
                {entry.description && (
                  <p className="text-sm text-gray-600 mb-3">{entry.description}</p>
                )}
                <div className="flex items-center space-x-6 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>{formatTime(entry.duration)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(entry.start_time), 'MMM dd, yyyy HH:mm')}</span>
                  </div>
                  {entry.end_time && (
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(entry.end_time), 'MMM dd, yyyy HH:mm')}</span>
                    </div>
                  )}
                  {entry.project?.hourly_rate && (
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">
                        ${((entry.duration / 3600) * entry.project.hourly_rate).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => handleEdit(entry)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setSelectedEntry(entry);
                    setShowDeleteModal(true);
                  }}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredEntries.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No time entries found</p>
        </div>
      )}

      {showEditModal && selectedEntry && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => {
                setShowEditModal(false);
                setSelectedEntry(null);
              }}
            />
            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Time Entry</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    value={editFormData.start_time}
                    onChange={(e) => setEditFormData({ ...editFormData, start_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    value={editFormData.end_time}
                    onChange={(e) => setEditFormData({ ...editFormData, end_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedEntry(null);
                    }}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleUpdate}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Update
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && selectedEntry && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedEntry(null);
              }}
            />
            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Time Entry</h3>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to delete this time entry? This action cannot be undone.
              </p>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedEntry(null);
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

