import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user } = useAuth();
  const [userRole, setUserRole] = React.useState<string>('user');

  React.useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role, email')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error('Error fetching user role:', error);
          return;
        }
        
        if (data) {
          setUserRole(data.role || 'user');
        }
      } catch (error) {
        console.error('Error in fetchUserRole:', error);
      }
    };
    
    fetchUserRole();
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar userRole={userRole} />
      <div className="flex-1">
        <main className="min-h-screen">{children}</main>
      </div>
    </div>
  );
};
