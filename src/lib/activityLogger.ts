import { supabase } from './supabase';

export interface ActivityLogParams {
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, any>;
}

export const logActivity = async (params: ActivityLogParams): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.rpc('log_activity', {
      p_user_id: user.id,
      p_action: params.action,
      p_entity_type: params.entityType || null,
      p_entity_id: params.entityId || null,
      p_details: params.details || {},
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};


