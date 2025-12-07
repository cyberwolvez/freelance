import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export const useRequireAdmin = () => {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      setLoading(true);
      setError(null);
      setIsAdmin(false);

      if (authLoading) {
        return;
      }

      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('role, email, id')
          .eq('id', user.id)
          .single();

        if (fetchError) {
          setError(fetchError);
          setLoading(false);
          return;
        }

        if (!data) {
          setLoading(false);
          return;
        }

        const userRole = String(data.role || '').trim().toLowerCase();
        const isAdminRole = userRole === 'admin';

        setIsAdmin(isAdminRole);
      } catch (err: any) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [user, authLoading]);

  return { isAdmin, loading, error };
};

