# Final-Performance-Management-System

A comprehensive, enterprise-grade Instructor & Manager Performance Management, Attendance, and Workload Analytics platform built with React 19, TypeScript, Vite, Tailwind CSS, Firebase Firestore, and SheetJS (`xlsx`).

---

## 🚀 Quick Start & Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
The application will launch on `http://localhost:3000`.

### 3. Production Build
```bash
npm run build
```
Build output is saved to the `dist/` directory.

---

## 📦 How to Push Full Code to GitHub as `Final-Performance-Management-System`

Follow these standard commands in your local terminal to initialize git and push the codebase to your new GitHub repository:

```bash
# 1. Initialize Git (if not already initialized)
git init -b main

# 2. Add all files to staging
git add .

# 3. Create the initial commit
git commit -m "Initial commit: Final-Performance-Management-System"

# 4. Link your remote GitHub repository
# (Replace YOUR_GITHUB_USERNAME with your actual GitHub username)
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/Final-Performance-Management-System.git

# 5. Push code to main branch
git push -u origin main
```

> **Note:** If you already have an existing remote origin, run `git remote set-url origin https://github.com/YOUR_GITHUB_USERNAME/Final-Performance-Management-System.git` instead.

---

## ⚡ Deployment to Vercel

This repository is pre-configured with `vercel.json` for seamless Vite SPA deployment with zero 404 client-side routing issues.

### Method 1: Deploy via Vercel Web Dashboard (Recommended)

1. Go to [https://vercel.com/new](https://vercel.com/new).
2. Connect your GitHub account and select **`Final-Performance-Management-System`**.
3. Vercel automatically detects the framework as **Vite**:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `./`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. **Environment Variables (Optional):**
   - The Firebase configuration is already bundled in `firebase-applet-config.json` and works immediately.
   - If you prefer configuring via environment variables, expand **Environment Variables** in Vercel and add:
     - `VITE_SUPABASE_URL` = `https://fuqqhvqqgogggcttshlz.supabase.co`
     - `VITE_SUPABASE_ANON_KEY` = `sb_publishable_foV3RGiEE7d-Usq0kWUqGQ_CrI_pI19`
     - Optional Firebase overrides: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, etc. (refer to `.env.example`).
5. Click **Deploy**. Your application will be live in ~1 minute!

### Method 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI globally
npm i -g vercel

# Login to Vercel
vercel login

# Deploy production build
vercel --prod
```

---

## 🌟 Core Features

1. **Role-Based Access Control:**
   - **Manager Portal:** Executive oversight, attendance tracking, 7-day grace period audits, and Excel export center.
   - **Instructor Dashboard:** Daily work log submissions, session tracking (lectures, labs, evaluations, invigilations), weekly burnout graphs, and personal scorecards.

2. **Accidental Leave Selection & Workday Conversion:**
   - Single-tap selection and single-tap unselect for Casual Leave, Sick Leave, and Unpaid Leave.
   - Clicking any class, session counter, or duration pill immediately exits leave mode and restores normal workday fields with clean defaults.
   - Converts previously submitted leaves to working days with updated hours and classes upon clicking **Save Workload**.

3. **Missed Daily Logs Tracking:**
   - Automatic detection of past working days missing a daily log submission.
   - Highlighted in red in both the monthly calendar and weekly burnout bar graph with clear warnings (**"Daily log not submitted"** / **"You haven't filled the daily log"**).
   - Real-time recalculation upon log submission.

4. **Reports & Excel Export Hub (`.xlsx`):**
   - **Option 1 (Individual Instructor Report):** Select any instructor, view a live table preview of verified records, and export a 3-sheet `.xlsx` workbook (Daily Workload, Weekly/Monthly Summaries, Leaves & Missed Logs Audit).
   - **Option 2 (Full Individual Reports):** Multi-sheet `.xlsx` workbook for all managed instructors, including a master Team Executive Summary and separate, dedicated worksheets for every instructor.
   - Built-in period presets (*This Month, Last Month, This Week, Last Week, Last 30 Days, Last 90 Days, YTD*) and custom start/end date range pickers.

---

## 📁 Project Structure

```text
├── src/
│   ├── components/
│   │   ├── auth/              # Role-based login and onboarding
│   │   ├── common/            # Navbar, Sidebar, KpiCards, Modals
│   │   ├── manager/           # Manager dashboard, weekly burnout, ReportsView
│   │   └── trainer/           # DailyWorkView, instructor scorecards
│   ├── context/               # AuthContext, DataContext (Firestore & Supabase), ToastContext
│   ├── lib/                   # excelReportGenerator, firebase, supabase, performanceEngine
│   └── types/                 # TypeScript interfaces and data models
├── firebase-applet-config.json # Firebase project configuration
├── firestore.rules            # Firestore security rules
├── vercel.json                # Vercel deployment and SPA routing configuration
├── .env.example               # Environment variables template
└── package.json               # Dependencies and scripts (name: final-performance-management-system)
```
