import React, { useState, useEffect } from 'react';
import { User, Mail, Clock, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const timezones = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
];

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    timezone: 'UTC',
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile(data);
        setFormData({
          full_name: data.full_name || '',
          email: data.email || user.email || '',
          timezone: data.timezone || 'UTC',
        });
      } else {
        // Create profile if it doesn't exist
        const newProfile = {
          id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || '',
          timezone: 'UTC',
        };

        const { error: insertError } = await supabase
          .from('profiles')
          .insert([newProfile]);

        if (insertError) throw insertError;

        setProfile(newProfile);
        setFormData({
          full_name: newProfile.full_name,
          email: newProfile.email,
          timezone: newProfile.timezone,
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: formData.email,
          full_name: formData.full_name,
          timezone: formData.timezone,
        });

      if (error) throw error;

      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('Error saving settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your account settings and preferences.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Full Name</span>
              </div>
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>Email Address</span>
              </div>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Enter your email"
              disabled
            />
            <p className="text-xs text-gray-500 mt-1">
              Email cannot be changed. Contact support if you need to update your email.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>Timezone</span>
              </div>
            </label>
            <select
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              {timezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>

          {message && (
            <div className={`p-3 rounded-lg ${
              message.includes('Error') 
                ? 'bg-red-50 border border-red-200 text-red-600' 
                : 'bg-green-50 border border-green-200 text-green-600'
            }`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
          >
            <Save className="h-5 w-5" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </form>
      </div>

      {/* Account Information */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Account Created:</span>
            <span className="text-gray-900">
              {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Last Updated:</span>
            <span className="text-gray-900">
              {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString() : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">User ID:</span>
            <span className="text-gray-900 font-mono text-xs">{user?.id}</span>
          </div>
        </div>
      </div>
    </div>
  );
};