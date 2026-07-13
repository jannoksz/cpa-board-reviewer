# 📘 CPA Board Reviewer

A single-page web application for reviewing CPA board exam questions. Designed to be lightweight, fast, and accessible — with cloud-backed persistence powered by **Supabase**.

> 💛 Built as a small act of support for someone preparing for the CPALE. Every question answered here is a step closer to that license.

---

## ✨ Features

* 📚 **6 Subjects**

  * FAR, AFAR, Management Services, Auditing, Taxation, RFBT

* 🎯 **4 Difficulty Levels**

  * Easy, Intermediate, Hard, Mastery

* 📝 **Exam Mode**

  * Questions are derived from curated and trusted materials from established CPA review centers (non-randomized)
  * Admin-controlled configuration of the number of questions per exam
  * Automatic scoring and result evaluation after submission

* 📊 **Performance Dashboard**

  * Exams taken
  * Average and highest score
  * Subject breakdown
  * Weak areas (below passing threshold)
  * Score trends over time

* 👤 **User Accounts**

  * Login & signup via Supabase Auth
  * Tracks individual progress and history

* 🧠 **Cloud-Based Question Bank**

  * Centralized storage using Supabase
  * Accessible across devices

* 🛠️ **Admin Tools**

  * Add, edit, delete questions
  * Supports MCQ and problem-solving types
  * Bulk import (CSV/JSON) with validation

* 🌙 **Dark Mode**

  * Saved per user/browser

---

## 🛠️ Tech Stack

* **Frontend:** HTML, CSS, Vanilla JavaScript
* **Backend-as-a-Service:** Supabase (Auth + PostgreSQL + REST API)
* **AI Assistance:** Claude (used for development support, code structuring, and feature ideation)
* **Icons & Fonts:** Font Awesome, Google Fonts

---

## 🏗️ Architecture Overview

```
Frontend (Vanilla JS)
        │
        ▼
Supabase Client (Project URL + Anon Key)
        │
        ▼
Supabase Services
- Authentication (Users)
- PostgreSQL Database
- REST API
```

* No custom backend server
* All data operations are handled via Supabase APIs
* Security enforced through **Row Level Security (RLS)**

---

## 🗂️ Project Structure

```
├── index.html   # UI, routing, and main application logic
└── db.js        # Data layer (Supabase queries + local handling)
```

* `db.js` acts as the central data handler:

  * Fetches questions
  * Stores exam results
  * Manages user-related data
* Supabase is initialized inline using project credentials

---

## 🚀 Getting Started

No build tools or installation required.

1. Clone or download this repository
2. Open `index.html` in your browser

Or serve locally:

```
npx serve .
```

---

## 🔧 Supabase Setup

To enable backend functionality:

1. Create a project at https://supabase.com

2. Copy your:

   * **Project URL**
   * **Anon Public API Key**

3. Add them to your code:

```javascript
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(
  'YOUR_SUPABASE_PROJECT_URL',
  'YOUR_SUPABASE_ANON_PUBLIC_KEY'
)
```

---

## 🔑 Authentication

Handled via **Supabase Auth**:

* User registration and login
* Session persistence
* Secure user-based data access

---

## 📊 Data Storage

All core data is stored in Supabase:

* Question bank
* Exam results
* User profiles

This enables:

* Cross-device access
* Persistent tracking
* Scalable storage

LocalStorage is optionally used for:

* UI preferences (e.g., dark mode)
* Lightweight caching

---

## 🔒 Security

* Uses **anon public key** only (safe for frontend use)
* Sensitive keys are never exposed
* **Row Level Security (RLS)** ensures:

  * Users can only access their own data
  * Data is protected at the database level

---

## 🤖 AI-Assisted Development

This project was developed with the assistance of **Claude AI**, which was used to:

* Help structure the application architecture
* Assist in writing and refining code
* Provide suggestions for features and improvements
* Support debugging and optimization

AI was used as a development aid, while all implementation decisions and integrations were finalized manually.

---

## 📝 Notes

* This is a **frontend-first application** with Supabase as a backend service
* No traditional backend (e.g., Node.js server) is required
* Designed for simplicity, portability, and ease of use

---

<p align="center">🍀 Good luck on the CPALE — you've got this. 🍀</p>
