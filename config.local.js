/**
 * 🔒 SECURITY: Configuration for Supabase credentials
 * 
 * This file loads at page startup (before CPA module).
 * For GitHub Pages deployment, this uses the public Supabase anon key.
 * Row Level Security (RLS) policies protect user data.
 */

if (!window.CONFIG) {
    window.CONFIG = {
        // GitHub Pages deployment: Public Supabase anon key (RLS-protected)
        SUPABASE_URL: 'https://oxygzkdacgfnhqqvlmjh.supabase.co',
        SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94eWd6a2RhY2dmbmhxcXZsbWpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NjU5MDM0MzAsImV4cCI6MTk4MTQ3OTQzMH0.VrmxSGPwZ2OFkM0d51hDLj81fHH6YXmhQZ8K2xN2L0s'
    };
}
