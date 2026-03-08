import { supabase } from '@/integrations/supabase/client';

export async function logAudit(
  action: string,
  tableName?: string,
  recordId?: string,
  oldData?: any,
  newData?: any
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('audit_logs').insert({
      action,
      table_name: tableName || null,
      record_id: recordId || null,
      old_data: oldData || null,
      new_data: newData || null,
      user_id: user?.id || null,
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
}
