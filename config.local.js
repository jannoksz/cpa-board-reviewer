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
        SUPABASE_URL: 'https://skosmgyicuwvlybkqdal.co',
        SUPABASE_ANON_KEY: 'seyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNrb3NtZ3lpY3V3dmx5YmtxZGFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3MDI5NDAsImV4cCI6MjA5OTI3ODk0MH0.smlfjA2Obvhzb-0rwYDEsHA3nSVd3nUgK6zoiCR50wsb_publishable_scCLt7VTNyIR-q8QDRPpxQ_4xMubH2Z'
    };
}

console.log('[Config] Supabase configuration loaded');
