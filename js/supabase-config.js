
/* ==========================================
   OMEGA GIFT POINT
   SUPABASE CONNECTION
========================================== */

const OGP_SUPABASE_URL = "https://noxrznsbcimuvvcbamww.supabase.co";

const OGP_SUPABASE_KEY = "sb_publishable_gb7hXJxPU87In9t6uEjisA_4x2FCMAP";

window.ogpSupabase = window.supabase.createClient(
    OGP_SUPABASE_URL,
    OGP_SUPABASE_KEY
);

console.log("Omega Gift Point: Supabase connected!");
