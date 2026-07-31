# GitHub Pages Deployment Guide

## ✅ Secure Credential Management

This project now uses **GitHub Secrets** to securely inject Supabase credentials at deploy time. Credentials are **NOT stored in the repository**.

## 🔧 Setup Instructions

### Step 1: Add GitHub Secrets

1. Go to your GitHub repository: `https://github.com/jannoksz/cpa-board-reviewer`
2. Click **Settings** (top navigation)
3. In the left sidebar, click **Secrets and variables** > **Actions**
4. Click **New repository secret**

### Step 2: Create SUPABASE_URL Secret

1. **Name:** `SUPABASE_URL`
2. **Value:** Your Supabase project URL
   - Example: `https://oxygzkdacgfnhqqvlmjh.supabase.co`
   - Find this at: Supabase Dashboard > Settings > API > URL

### Step 3: Create SUPABASE_ANON_KEY Secret

1. **Name:** `SUPABASE_ANON_KEY`
2. **Value:** Your Supabase public anon key
   - Find this at: Supabase Dashboard > Settings > API > Key (the "anon" key, not "service_role")
   - This is the public key and is safe to use in browser code when RLS is configured

### Step 4: Trigger Deployment

After adding the secrets, push a commit to trigger the workflow:

```bash
git push origin main
```

The GitHub Actions workflow will:
1. Check out your code
2. Inject the secrets into `config.local.js`
3. Deploy to GitHub Pages

### Step 5: Verify Deployment

- Check the "Actions" tab in your GitHub repository
- Wait for the workflow to complete
- Visit: `https://jannoksz.github.io/cpa-board-reviewer/#/`

## 🔒 Security Best Practices

### ✅ What We're Doing Right

1. **Credentials NOT in repository** - Secrets are stored in GitHub, not in git
2. **Environment-specific injection** - Different credentials per environment
3. **Public anon key** - Safe when Supabase RLS is properly configured
4. **No plaintext exposure** - Credentials never appear in logs or source history

### ⚠️ Important Reminders

- **Never commit real credentials** - Always use GitHub Secrets
- **Verify RLS policies** - Supabase RLS protects data access
- **Rotate keys regularly** - Update secrets if compromise is suspected
- **Keep anon key private** - Don't share it outside your GitHub Actions

## 📝 Local Development

For local development with different credentials:

1. Create `config.local.js.local` (gitignored):
   ```javascript
   if (!window.CONFIG) {
       window.CONFIG = {
           SUPABASE_URL: 'your-dev-url',
           SUPABASE_ANON_KEY: 'your-dev-key'
       };
   }
   ```

2. Update `index.html` line 6 (temporarily) to load `config.local.js.local`

3. Revert before committing

## 🚀 Deployment Workflow

```
Code Push → GitHub Actions Workflow Triggered
    ↓
Inject Secrets from GitHub Secrets
    ↓
Build & Upload to Pages Artifact
    ↓
Deploy to GitHub Pages
    ↓
Live at: jannoksz.github.io/cpa-board-reviewer
```

## ❓ Troubleshooting

### Workflow doesn't run
- Check the "Actions" tab - did it trigger?
- Verify your commit was pushed: `git log --oneline origin/main | head -5`

### Deployment succeeds but app won't load
- Check browser console (F12) for errors
- Verify secrets are set in Settings > Secrets and variables
- Check if `config.local.js` is loaded (Network tab in DevTools)

### "CONFIG is undefined" error
- Secrets weren't properly injected
- Verify SUPABASE_URL and SUPABASE_ANON_KEY are both set
- Re-run the workflow: Push a dummy commit

## 📚 Additional Resources

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [GitHub Pages Deployment](https://docs.github.com/en/pages/getting-started-with-github-pages)
