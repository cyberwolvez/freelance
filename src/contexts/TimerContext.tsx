import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { logActivity } from '../lib/activityLogger';

interface TimerContextType {
  activeEntry: any | null;
  isRunning: boolean;
  elapsedTime: number;
  startTimer: (projectId: string, description?: string) => Promise<void>;
  stopTimer: () => Promise<void>;
  pauseTimer: () => Promise<void>;
  resumeTimer: () => Promise<void>;
  refreshActiveEntry: () => Promise<void>;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
};

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [activeEntry, setActiveEntry] = useState<any | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user) {
      refreshActiveEntry();
    }
  }, [user]);

  useEffect(() => {
    if (isRunning && activeEntry) {
      const id = setInterval(() => {
        const now = new Date();
        const startTime = new Date(activeEntry.start_time);
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
      setIntervalId(id);

      return () => {
        if (id) clearInterval(id);
      };
    } else {
      if (intervalId) {
        clearInterval(intervalId);
        setIntervalId(null);
      }
    }
  }, [isRunning, activeEntry]);

  const refreshActiveEntry = async () => {
    if (!user) return;

    const { data, error } = await supabase
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
      .eq('is_running', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching active entry:', error);
      return;
    }

    if (data) {
      setActiveEntry(data);
      setIsRunning(true);
      const now = new Date();
      const startTime = new Date(data.start_time);
      const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      setElapsedTime(elapsed);
    } else {
      setActiveEntry(null);
      setIsRunning(false);
      setElapsedTime(0);
    }
  };

  const startTimer = async (projectId: string, description?: string) => {
    if (!user) return;
    if (activeEntry) {
      await stopTimer();
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('time_entries')
      .insert([
        {
          user_id: user.id,
          project_id: projectId,
          description: description || '',
          start_time: now,
          is_running: true,
        },
      ])
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
      .single();

    if (error) {
      console.error('Error starting timer:', error);
      return;
    }

    await logActivity({
      action: 'started_timer',
      entityType: 'time_entry',
      entityId: data.id,
      details: {
        projectName: data.projects?.name,
        description: description || '',
      },
    });

    setActiveEntry(data);
    setIsRunning(true);
    setElapsedTime(0);
  };

  const stopTimer = async () => {
    if (!activeEntry || !user) return;

    const now = new Date().toISOString();
    const startTime = new Date(activeEntry.start_time);
    const endTime = new Date(now);
    const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

    const { error } = await supabase
      .from('time_entries')
      .update({
        end_time: now,
        duration,
        is_running: false,
      })
      .eq('id', activeEntry.id);

    if (error) {
      console.error('Error stopping timer:', error);
      return;
    }

    await logActivity({
      action: 'stopped_timer',
      entityType: 'time_entry',
      entityId: activeEntry.id,
      details: {
        projectName: activeEntry.projects?.name,
        duration: Math.floor((endTime.getTime() - startTime.getTime()) / 1000),
      },
    });

    setActiveEntry(null);
    setIsRunning(false);
    setElapsedTime(0);
  };

  const pauseTimer = async () => {
    if (!activeEntry || !user) return;

    const now = new Date().toISOString();
    const startTime = new Date(activeEntry.start_time);
    const endTime = new Date(now);
    const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

    const { error } = await supabase
      .from('time_entries')
      .update({
        end_time: now,
        duration,
        is_running: false,
      })
      .eq('id', activeEntry.id);

    if (error) {
      console.error('Error pausing timer:', error);
      return;
    }

    setActiveEntry(null);
    setIsRunning(false);
    setElapsedTime(0);
  };

  const resumeTimer = async (entryId: string) => {
    if (!user) return;

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('time_entries')
      .update({
        start_time: now,
        end_time: null,
        is_running: true,
      })
      .eq('id', entryId)
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
      .single();

    if (error) {
      console.error('Error resuming timer:', error);
      return;
    }

    setActiveEntry(data);
    setIsRunning(true);
    setElapsedTime(0);
  };

  const value = {
    activeEntry,
    isRunning,
    elapsedTime,
    startTimer,
    stopTimer,
    pauseTimer,
    resumeTimer,
    refreshActiveEntry,
  };

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
};