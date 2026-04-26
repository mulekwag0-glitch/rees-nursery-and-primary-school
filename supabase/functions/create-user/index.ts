import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !requestingUser) {
      throw new Error('Invalid token');
    }

    // Check if requesting user is admin
    const { data: roleRows } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id);

    const isAdmin = (roleRows || []).some((r: { role: string }) => r.role === 'admin');
    if (!isAdmin) {
      throw new Error('Only admins can create users');
    }

    const { email, password, full_name, role } = await req.json();

    if (!email || !password || !full_name || !role) {
      throw new Error('Missing required fields');
    }

    // Block creating student accounts from this admin tool — pupils are managed via Admissions
    if (role === 'student') {
      throw new Error('Student accounts cannot be created here. Use the Admissions module to admit pupils.');
    }

    // Try to create the user; if one already exists, look it up and just (re)assign role
    let userId: string | null = null;
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (createError) {
      const msg = (createError.message || '').toLowerCase();
      const alreadyExists = msg.includes('already') || msg.includes('registered') || msg.includes('exists');
      if (!alreadyExists) throw createError;

      // Find the existing user by email so we can just sync role + reset password
      const { data: list, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;
      const existing = list.users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase());
      if (!existing) throw createError;
      userId = existing.id;

      // Reset password & confirm email so they can sign in with the temp password
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });
    } else {
      userId = newUser.user.id;
    }

    // Upsert profile (id is PK)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({ id: userId!, email, full_name }, { onConflict: 'id' });
    if (profileError) console.error('Profile upsert error:', profileError);

    // Replace role assignment so the requested role is the active one
    await supabaseAdmin.from('user_roles').delete().eq('user_id', userId!);
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: userId!, role });
    if (roleError) console.error('Role assignment error:', roleError);

    console.log('Account ready:', userId);

    return new Response(
      JSON.stringify({ success: true, user_id: userId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});