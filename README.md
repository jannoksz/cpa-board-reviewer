# CPA & Civil Service Board Reviewer

A browser-based study app for CPALE and Philippine Civil Service Exam preparation. It provides subject-based practice, progress tracking, and an administrator-managed question bank, with Supabase providing authentication and shared data storage.

> 💛 Built as a small act of support for people preparing for their board and civil service exams. Every question answered is a step closer to the goal.

## Features

### CPA Board reviewer

- Covers the six CPALE subjects: FAR, AFAR, Management Services, Auditing, Taxation, and RFBT.
- Admin-defined topics let reviewers organize each subject around their question bank.
- Topic exams include all questions in the selected topic, in shuffled order.
- A subject's Mastery Exam combines its questions across topics. It unlocks after the reviewer earns a score of at least 75% on every topic in that subject.

### Civil Service reviewer

- Covers Verbal Ability, Numerical Ability, Analytical Ability, and General Information.
- Offers Professional and Sub-professional levels. Each level has its own topics, questions, and progress.
- Uses the same topic-exam and gated Mastery Exam format as the CPA reviewer.

### Shared app features

- Switch between reviewers at any time; the selected reviewer and Civil Service level are saved in the current browser.
- Sign up and log in with Supabase Auth. Exam history and progress are associated with the signed-in account.
- Dashboard with scores, exam history, subject breakdowns, weak areas, and score trends.
- Admin-only question bank for creating, renaming, and deleting topics and questions.
- Supports multiple-choice and problem-solving questions, with CSV and JSON bulk import.
- JSON question-bank export and import for backups. Imports restore topics and questions; exported exam results are not restored by import.
- Dark mode preference saved in the current browser.

## Tech stack

- HTML, CSS, and vanilla JavaScript
- Supabase JavaScript client (Auth and database APIs)
- DOMPurify for sanitizing formatted question content
- Font Awesome and Google Fonts

## How it works

The app is a static single-page application; it does not require a custom server or build step. Its application logic and Supabase data access are embedded in `index.html`, and its styles are in `style.css`.

Supabase stores the shared topics and questions, plus each signed-in user's exam results. Authentication and database access depend on the Supabase project configuration and Row Level Security (RLS) policies. Access to the Question Bank is limited in the app to accounts whose `profiles.is_admin` value is enabled.

The selected reviewer, Civil Service level, and theme are browser-local preferences. They are not synced across devices.

## Run locally

1. Clone or download the repository.
2. Configure `window.CONFIG` with your Supabase project URL and anon/publishable key in the local `config.local.js` file loaded by `index.html`.
3. Before adding real credentials, verify that your local config file is ignored and untracked; never commit credentials or a Supabase service-role key.
4. Serve the repository root with a static web server, for example:

   ```bash
   npx serve .
   ```

5. Open the local URL printed by the server and sign in.

The Supabase project must have the tables, authentication settings, and RLS policies expected by the app. The public anon/publishable key is used in the browser, so database security must be enforced by correctly configured RLS policies.

## Deploy to GitHub Pages

The included GitHub Actions workflow deploys the static app when changes are pushed to `main` or when the workflow is manually run. Add these repository Actions secrets before deployment:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

See [GITHUB_DEPLOYMENT.md](./GITHUB_DEPLOYMENT.md) for setup and troubleshooting details. Remember that values included in a deployed browser app are visible to visitors; the anon/publishable key must only be used with appropriate RLS policies. Never expose a service-role key.

## Project structure

```text
├── index.html                 # App markup, routing, UI, and current data-layer logic
├── style.css                  # App styles
├── db.js                      # Separate data-layer file; index.html currently uses its inline implementation
├── .github/workflows/deploy.yml
└── GITHUB_DEPLOYMENT.md       # GitHub Pages deployment instructions
```

## Notes

- Question content should come from curated, trusted CPA and Civil Service review materials.
- Back up the question bank regularly using the Question Bank's Export action.
- This app is an independent study aid and is not affiliated with an exam board or review center.

<p align="center">🍀 Good luck with your review — you've got this. 🍀</p>
