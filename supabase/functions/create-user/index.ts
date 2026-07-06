// supabase/functions/create-user/index.ts
//
// Edge Function: Creates a new auth user + profile row, restricted to admins.
// Deploy with: supabase functions deploy create-user
//
// SECURITY: Uses the service_role key, which only exists server-side inside
// this function (set automatically by Supabase as an environment variable).
// It is NEVER exposed to the frontend/browser.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "غير مصرح" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Client scoped to the requester's own JWT — used only to verify who's calling
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user: caller } } = await callerClient.auth.getUser()
    if (!caller) {
      return new Response(JSON.stringify({ error: "غير مصرح" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Verify caller is admin/super_admin
    const adminClient = createClient(supabaseUrl, serviceKey)
    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single()

    if (!callerProfile || !["admin", "super_admin"].includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: "ليس لديك صلاحية لإضافة مستخدمين" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Parse request body
    const { email, password, full_name, role, department, phone, employee_id } = await req.json()

    if (!email || !password || !full_name || !role) {
      return new Response(JSON.stringify({ error: "البيانات المطلوبة غير مكتملة" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // 1. Create the auth user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // skip email verification since admin is creating it
    })

    if (createError) {
      const msg = createError.message.includes("already registered")
        ? "البريد الإلكتروني مستخدم بالفعل"
        : createError.message
      return new Response(JSON.stringify({ error: msg }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // 2. Create/update the profile row with role and metadata
    const { error: profileError } = await adminClient
      .from("profiles")
      .upsert({
        id: newUser.user.id,
        full_name,
        role,
        department: department || null,
        phone: phone || null,
        employee_id: employee_id || null,
        is_active: true,
      })

    if (profileError) {
      // Rollback: delete the auth user if profile creation failed
      await adminClient.auth.admin.deleteUser(newUser.user.id)
      return new Response(JSON.stringify({ error: "فشل إنشاء بيانات المستخدم: " + profileError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify({ success: true, user_id: newUser.user.id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "حدث خطأ غير متوقع" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
