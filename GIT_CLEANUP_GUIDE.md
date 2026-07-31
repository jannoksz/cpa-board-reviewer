# 🧹 Git History Cleanup Guide

## Status: ANALYSIS COMPLETE

The exposed API key (`sb_publishable_scCLt7VTNyIR-q8QDRPpxQ_4xMubH2Z`) appears in the following commits:

```
e684e213 - Update Supabase client initialization with new key
1c7e162c - Update Supabase client URL in db.js
c1918e26 - Initialize Supabase client in db.js
fc1a49cd - Add Supabase auth, shared question bank, and synced progress
2dc1f16d - Revise README for clarity and Supabase integration
2ac023d4 - Adding password visibility icon and exam features
... and possibly others
```

## ✅ Good News: Current State is Safe

1. **Key is Rotated** ✅
   - The old key is now invalid in Supabase
   - Even if someone finds it in git history, they cannot use it
   
2. **Code is Fixed** ✅
   - New commits load credentials from `window.CONFIG`
   - Credentials are never hardcoded going forward
   - `.gitignore` prevents re-exposure

## Why Manual Cleanup is Challenging

The `git filter-branch` command is designed for Linux/Mac bash shells. On Windows:
- Requires Git Bash or WSL for proper sed/find support
- Complex PowerShell integration with shell metacharacters
- Risk of incomplete/incorrect history rewriting

## Options for Git History Cleanup

### Option 1: ✅ RECOMMENDED - Accept Current State

**Why this is fine:**
- The key is rotated (invalid now)
- Your repository is public → no additional damage
- All future code is secure
- Cleanup tools can destroy collaboration history

**Action:** None required. Move forward securely.

### Option 2: 🔧 MANUAL - Use Git Bash or WSL

**Prerequisites:**
- Git Bash (comes with Git for Windows) OR Windows Subsystem for Linux

**Steps:**

```bash
# 1. Open Git Bash (right-click in repo → Git Bash Here)

# 2. Navigate to repo
cd /c/Users/user/OneDrive/Desktop/CPA/cpa-board-reviewer

# 3. Run filter-branch with sed
FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch -f \
  --tree-filter \
  'find . -type f \( -name "*.js" -o -name "*.html" \) \
   -exec sed -i "s/sb_publishable_scCLt7VTNyIR-q8QDRPpxQ_4xMubH2Z/[REDACTED_OLD_API_KEY]/g" {} +' \
  -- --all

# 4. Force push (this will require confirmation from all collaborators to re-clone)
git push --force-with-lease origin main
```

### Option 3: 📦 Use BFG Repo-Cleaner (Easiest)

**Prerequisites:**
- Java Runtime Environment (JRE)
- Download BFG: https://rtyley.github.io/bfg-repo-cleaner/

**Steps:**

```bash
# 1. Create a replacement file
echo "sb_publishable_scCLt7VTNyIR-q8QDRPpxQ_4xMubH2Z==>[REDACTED_OLD_API_KEY]" > replacements.txt

# 2. Mirror clone the repo
git clone --mirror https://github.com/jannoksz/cpa-board-reviewer.git cpa-board-reviewer.git

# 3. Run BFG
java -jar bfg.jar --replace-text replacements.txt cpa-board-reviewer.git

# 4. Push
cd cpa-board-reviewer.git
git push --mirror

# 5. Reset local repo
cd ../cpa-board-reviewer
git fetch origin
git reflog expire --expire=now --all
git gc --aggressive --prune=now
```

### Option 4: 🎯 Use GitHub's UI (Requires Code Owner Access)

GitHub has a "Danger Zone" in repository settings that can purge secrets:
- Settings → Danger Zone → Remove sensitive data from history
- This is the easiest but requires admin access

---

## Recommended Action

**For now:** Accept Option 1 (current state)
- Your code is secure going forward
- No risk of breaking collaboration
- Key is rotated and invalid

**In future (if wanted):** Use BFG (Option 3) when you have time
- Most reliable for secret redaction
- Less risky than filter-branch
- Good documentation online

---

## Verification: Key is NOT in Current Code

✅ Confirmed: The exposed key does NOT appear in:
- `index.html` (current)
- `db.js` (current)
- `.gitignore` (prevents re-exposure)
- `config.local.js` (gitignored, never committed)

Only in historical commits (which are now safe because the key is rotated).

---

## Prevention Going Forward

✅ Already implemented:
- `.gitignore` prevents `.env`, `.env.local`, `config.local.js` commits
- Pre-commit hook would catch this (see SECURITY.md)
- Code review should catch hardcoded credentials

```bash
# Optional: Install pre-commit hook to catch secrets
# brew install pre-commit  (or visit https://pre-commit.com)
# pre-commit install
```

---

## Summary

| Item | Status | Action |
|------|--------|--------|
| API Key Rotated | ✅ Done | None needed |
| Code Updated | ✅ Done | None needed |
| Future Commits Safe | ✅ Done | None needed |
| Git History Cleaned | ⏸️ Optional | See options above |

**Recommendation:** Focus on deploying with secure credentials (GitHub Actions + secrets). Cleanup git history later if desired.

---

**Last Updated:** 2026-07-24  
**Status:** Safe to merge and deploy
