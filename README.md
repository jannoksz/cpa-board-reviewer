# 📘 CPA Board Reviewer

A single-page web app for reviewing CPA board exam questions — self-contained, front-end only, with all data stored in the browser's `localStorage`. No server or database setup required.

> 💛 Built as a small act of support for someone preparing for the CPALE. Every question answered here is a step closer to that license.

## ✨ Features

- 📚 **6 subjects**: FAR, AFAR, Management Services, Auditing, Taxation, and RFBT
- 🎯 **4 difficulty tiers per subject**: Easy, Intermediate, Hard, and Mastery
- 📝 **Exam mode**: pulls a randomized, configurable-count set of questions per subject/level and scores the attempt
- 📊 **Dashboard**: tracks exams taken, average score, highest score, subject-by-subject breakdown, weak areas (scores below a passing threshold), and score trends over time
- 🙋 **Reviewer identity**: remembers a reviewer's name on-device so multiple people can track separate progress on the same browser
- 🔐 **Admin question bank manager**: passcode-protected screen for adding, editing, and deleting questions
  - Supports both multiple-choice (MCQ) and problem-solving question types
  - **Bulk import** from CSV or JSON, with flexible column/field name matching and per-row error reporting
- 💾 **Data backup**: export/import all questions and results as JSON (merge or replace)
- 🌙 **Dark mode** toggle, remembered across sessions

## 🛠️ Tech Stack

- Plain HTML, CSS, and vanilla JavaScript — no build step, no framework
- [Font Awesome](https://fontawesome.com/) for icons, Google Fonts (Fraunces + Inter + IBM Plex Mono) for typography
- Hash-based client-side router (`#/`, `#/subject/:id`, `#/exam/:subject/:level`, `#/admin`, `#/admin/:subject/:level`)
- All persistence via the browser's `localStorage` — data lives only on the device/browser it was created in

## 🗂️ Project Structure

```
├── index.html   # Markup, styles, and all UI/routing logic
└── db.js        # Data layer — the single source of truth for reading/writing
                  # questions, results, and settings via localStorage
```

`db.js` exposes a `CPA` namespace with the app's full API (question CRUD, bulk import, exam building, results/stats, import/export, admin auth, etc.), so every screen talks to the same functions instead of touching `localStorage` directly.

## 🚀 Getting Started

No installation or build tools needed.

1. Clone or download this repository
2. Open `index.html` directly in a browser, **or** serve it locally, e.g.:
   ```bash
   npx serve .
   ```
3. Start reviewing from the dashboard

## 🔑 Admin Access

The question bank manager is gated behind a passcode. The passcode is never stored in plain text — only its SHA-256 hash is kept in `db.js` and compared against what's typed in.

To change the admin passcode:
1. Compute the SHA-256 hash of your new passcode
2. Replace the `ADMIN_PASSCODE_HASH` value in `db.js` with the new hash

## 🔒 Data & Privacy

All questions and results are stored locally in the browser via `localStorage`. This means:
- Data does **not** sync across devices or browsers
- Clearing browser data/cache will erase questions and progress
- Use the built-in **Export** feature regularly to back up your question bank and results as a JSON file, and **Import** to restore or migrate data

## 📝 Notes

This is a static front-end app — nothing here is a "backend" in the server sense. `db.js` is described in-code as the app's data layer/"backend," but it operates entirely client-side against `localStorage`.

---

<p align="center">🍀 Good luck on the CPALE — you've got this. 🍀</p>
