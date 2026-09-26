import { createClient } from "@supabase/supabase-js";

const json = (body, status = 200) => Response.json(body, { status });

const getAdminUser = async (request) => {
  const authorization = request.headers.get("authorization") || "";
  const accessToken = authorization.replace(/^Bearer\s+/i, "").trim();
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!accessToken || !supabaseUrl || !serviceRoleKey) return null;

  const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${accessToken}` },
  });
  if (!authResponse.ok) return null;

  const user = await authResponse.json();
  const profileResponse = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=role&limit=1`,
    { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } },
  );
  if (!profileResponse.ok) return null;

  const profiles = await profileResponse.json();
  return profiles[0]?.role === "admin" ? user : null;
};

export async function POST(request) {
  try {
    if (!await getAdminUser(request)) {
      return json({ error: "Only administrators can create staff accounts." }, 403);
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const body = await request.json();

    const firstname = String(body?.firstname || "").trim();
    const lastname = String(body?.lastname || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const role = body?.role === "admin" ? "admin" : "staff";

    if (!firstname || !lastname || !email || !password) {
      return json({ error: "First name, last name, email, and password are required." }, 400);
    }
    if (password.length < 8) return json({ error: "Password must be at least 8 characters." }, 400);

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { firstname, lastname },
    });
    if (createError || !created.user) {
      return json({ error: createError?.message || "Unable to create the account." }, 400);
    }

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .upsert(
        { id: created.user.id, firstname, lastname, email, role, deleted_at: null },
        { onConflict: "id" },
      )
      .select("id, firstname, lastname, email, avatar_url, role, deleted_at, created_at")
      .single();

    if (profileError || !profile) {
      await adminClient.auth.admin.deleteUser(created.user.id);
      return json({ error: profileError?.message || "Unable to save the account profile." }, 500);
    }

    return json({ profile }, 201);
  } catch (error) {
    console.error("Admin account creation failed:", error);
    return json({ error: error?.message || "Account creation failed on the server." }, 500);
  }
}
