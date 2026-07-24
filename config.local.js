/**
 * 🔒 SECURITY: Configuration for Supabase credentials
 * 
 * IMPORTANT: This file is overwritten by GitHub Actions at deploy time.
 * Credentials are injected from GitHub Secrets, not stored in source code.
 * 
 * For local development:
 * 1. Copy this file to config.local.js.local (gitignored)
 * 2. Add your own Supabase credentials
 * 3. Update index.html to load config.local.js.local instead
 * 
 * For GitHub Pages deployment:
 * 1. Go to Settings > Secrets and variables > Actions
 * 2. Add secrets:
 *    - SUPABASE_URL: your supabase project URL
 *    - SUPABASE_ANON_KEY: your supabase public anon key
 * 3. The GitHub Actions workflow will inject these at deploy time
 */

if (!window.CONFIG) {
    window.CONFIG = {
        // Populated by GitHub Actions workflow from secrets
        SUPABASE_URL: '',
        SUPABASE_ANON_KEY: ''
    };
}

console.log('[Config] Supabase configuration loaded');
