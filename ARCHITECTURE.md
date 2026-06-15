# Code-UP — Architecture & Implementation Guide

## Project Overview
Code-UP is a premium Egyptian EdTech platform targeting secondary students (covering 4th Primary → 3rd Secondary) with an Arabic-first, dark-native UI, AI-powered study planning, multi-provider secure video delivery, and an access-code enrollment model managed by teachers and a superadmin.

> **Last updated:** 2026-06-14. See [Recent Additions](#recent-additions-2026-06) for the latest changes (multi-provider video, per-video watch quotas, mark-complete flow, and the teacher analytics dashboard).

---

## Tech Stack

### Frontend
- **Framework**: Next.js 16 App Router (React 19)
- **Styling**: Tailwind CSS 4 with a CSS-variable design-token layer (`--bg / --surface / --card / --border / --ink / --ink-muted / --accent`, plus a semantic z-index scale)
- **Animations**: Framer Motion ^12.40
- **Charts**: hand-rolled dependency-free SVG charts (`src/components/admin/Charts.tsx`) — no chart library
- **Language**: TypeScript
- **Direction**: RTL (Arabic primary), `Cairo` font family

### Backend
- **Runtime**: Node.js + Next.js API Routes
- **Database**: **SQLite** (dev) via Prisma ORM. The Prisma client is generated to `src/generated/prisma` (provider `prisma-client`, not the legacy `prisma-client-js`).
- **Authentication**: JWT-based via `jose`, HTTP-only cookie (`auth_token`)
- **Password Hashing**: bcryptjs

### Video Delivery — Multi-Provider
Videos are no longer Bunny-only. Each video chooses a provider; a single dispatcher resolves the embed URL:
- **VdoCipher** — server-side OTP (strongest DRM)
- **Bunny Stream** — SHA256-signed embed token
- **YouTube** — unlisted/private via `youtube-nocookie.com` (autoplay + modestbranding; protection is domain + referrer + client-side deterrents, no server token)

Dispatcher: `src/lib/video-provider.ts` → `resolveEmbedUrl(video)` + `validateProviderId(provider, id)`. Per-provider helpers in `src/lib/bunny.ts` and `src/lib/youtube.ts`.

---

## Database Schema

### Core Models

#### User
- Multi-role system: student, teacher, superadmin
- Authentication via email + bcrypt password
- Tracking: Educational stage, phone, age, last login
- Soft delete via `isActive` flag

#### Course
- Created by teachers
- Organized into folders for structured content
- Thumbnail support for visual representation
- Filters by educational stage & subject

#### Folder
- Hierarchical organization within courses
- Contains videos and quizzes
- Sortable via `order` field

#### Video
- **Multi-provider**: `videoProvider` (`vdocipher` | `bunny` | `youtube`) + `providerVideoId`. `vdoCipherId` is kept as a legacy column for old rows.
- `durationMinutes` — teacher-entered; drives the watch-progress bar and the mark-complete gate.
- `maxWatchesPerUser` (default 3) — **per-video** watch quota (replaces the old course-wide `maxWatchCount`).
- Progress tracking per student; organized by folder.

#### VideoWatchSession
- One row per watch session: `sessionToken`, `videoId`, `studentId`, `startedAt`, `expiresAt`, `endedAt`, `usedWatchSlot`.
- 4-hour session tokens; a session consumes one of the video's `maxWatchesPerUser` slots.
- Used to compute remaining watches and powers the analytics "views over time".

#### Progress
- `(studentId, videoId)` unique; `watched` + `watchedAt`. Set by the mark-complete endpoint (manual button, or auto on YouTube end event).

#### SupportTicket / StudentFeedback / ClientError
- Surfaced in the teacher overview "issues feed" (complaints, unresolved feedback, platform errors).

#### Quiz
- Multiple-choice format (A, B, C, D options)
- Configurable time limit
- Question ordering support
- Result tracking with scores

#### AccessCode
- Unique codes for unlocking courses
- Can be deactivated by teachers
- Tracks student usage and timestamps

#### DailyStudyPlan (AI Feature)
- JSON-based plan content
- Status tracking: pending → in_progress → completed
- Per-student, per-date uniqueness

---

## Core Features Implementation

### 1. User Roles & Access Control

#### Student
- Browse and enroll in courses via access codes
- Track progress on videos
- Submit quizzes and view results
- Access daily AI study plans
- View profile and statistics

#### Teacher
- Create/manage courses and folders
- Add videos (via Bunny Stream)
- Create interactive quizzes
- Generate and revoke access codes
- View student analytics
- See individual student progress

#### Superadmin
- Master password authentication
- Create teacher accounts (name + password)
- System-wide analytics
- User management

### 2. Authentication & Security

**Sign-Up/Login Fields:**
- Name, Email, Password, Phone, Age, Educational Stage
- Passwords: bcryptjs hashing (bcryptjs v3.0.3)
- Session: JWT tokens in HTTP-only cookies
- Token expiry: 7 days

**Token Structure:**
```typescript
{
  id: string;
  email: string;
  name: string;
  role: Role;
  iat: number;
  exp: number;
}
```

### 3. Video Management (Multi-Provider)

**Teacher Workflow (per video):**
1. Pick a provider in the panel: VdoCipher / Bunny / YouTube.
2. Paste the matching ID (`validateProviderId` enforces format — e.g. YouTube must be 11 chars).
3. Optionally set **duration (minutes)** and **watches-per-student** (1/2/3/5/10/20, or custom).
4. Video appears to enrolled students; the watch limit is editable inline later.

**Playback Security (per provider):**
- **VdoCipher**: server-side OTP, fetched on demand — strongest DRM.
- **Bunny**: SHA256-signed embed token (`getBunnyEmbedUrl`).
- **YouTube**: `youtube-nocookie.com` embed with `autoplay=1`, `modestbranding=1`, `rel=0`; no server token, so protection is domain + `referrerPolicy="strict-origin"` + client deterrents (right-click block, F12/Ctrl+Shift+I/U/S suppression).
- The raw provider URL is never sent to the page until a valid watch session exists.

### 3a. Watch Sessions, Quotas & Completion

- `POST /api/videos/[id]/watch` opens (or reuses) a 4-hour `VideoWatchSession`, consuming one of the video's `maxWatchesPerUser` slots, and returns the resolved `embedUrl` + `provider`.
- The learn page (`/courses/[id]/learn`, TOFAS-style split panel) plays the video **inline** with: a sequential lock (next lesson locked until the previous is watched), a course-progress ring, a per-video watch-slot bar, and a session countdown.
- A **time-progress bar** (from `durationMinutes`) gates a green **"أنهيت المحاضرة"** button at ≥80% elapsed. Clicking it calls `POST /api/videos/[id]/complete` → marks `Progress.watched`. YouTube also auto-completes on the player `ended` event.

### 4. Quiz System

**Features:**
- Multiple-choice questions (A, B, C, D)
- Time-limited attempts (configurable per quiz)
- Automatic scoring
- Results tracking and analytics
- Question ordering support

**Student Workflow:**
1. Click "Take Quiz" inside folder
2. Read questions and select answers
3. Submit before time expires
4. View instant score and results

### 5. Access Code System

**Teacher Side:**
- Generate unique codes per course (automatic or custom naming)
- Deactivate codes for specific students
- Bulk operations support (future enhancement)

**Student Side:**
- Enter code on Courses page
- Unlock entire course and all content
- Access granted immediately
- Code revocation = instant access loss

### 6. AI Study Assistant

**Daily Plan Generation:**
```
Input: Student's progress, enrolled courses, educational stage
Output: JSON-based study plan with:
  - Topics to study
  - Estimated duration
  - Content type (video/quiz/reading)
  - Priority level
```

**Fallback Mechanism:**
- Primary API: (configured in environment)
- Backup API: (auto-switches on failure)
- Graceful degradation: Shows default plan if both fail

**Plan UI:**
- Chat-like interface for updates
- Drag-and-drop reordering
- Mark items as complete
- Regenerate option

### 7. Dashboard Features

#### Student Dashboard (Home/Account)
- Profile information (read-only)
- Statistics: courses enrolled, videos watched, quiz average
- Recent activity
- Study plan widget

#### Teacher Dashboard (/adminpanel/teacher)
Mobile-responsive (shared `AdminSidebar` = static rail on desktop, slide-in drawer + hamburger on mobile). SVG icon set (`AdminIcons.tsx`), design-token styling throughout.

- **Overview / analytics** (`TeacherOverview.tsx` ← `/api/admin/analytics`):
  - Personalized welcome (`أهلاً، <name> 👋`)
  - **Period filter** (7d / 30d / 90d / all) + **manual course filter**
  - KPI cards with period-over-period deltas: total students (+new this period), views, completed lessons, avg quiz score
  - **Views & enrollments over time** (SVG area + dashed line chart)
  - **Top videos** and **low-view videos** (the "needs attention" list)
  - Per-course performance + quiz-score distribution
  - **Issues feed**: open support tickets, unresolved feedback, recent client errors, and data-health warnings (missing course thumbnail, videos without duration, empty folders, 0-view videos)

- **Course editor** (tabbed: المحتوى / الإعدادات / التسعير):
  - Create/delete courses **and folders** (folder delete cascades content)
  - Add videos/quizzes/materials; inline per-video watch-limit selector
  - Settings + pricing (free/paid, discount with expiry)

- **Student & code management**: view students per course, ban/unban, generate/toggle access codes.

#### Superadmin Dashboard (/adminpanel/superadmin)
- Teacher account creation (Name + Password)
- System overview
- User statistics
- Course analytics

---

## UI/UX Enhancements

### 1. Dark Mode
- Toggle button in Navbar
- Persistent storage via localStorage
- CSS custom properties for theming
- Implemented via Tailwind dark: classes

### 2. RTL Support
- HTML: `dir="rtl"` on root
- Language: Arabic (ar)
- Navbar links order reversed
- Form labels positioned correctly
- Flexbox/Grid use `flex-row-reverse` where needed

### 3. Animations (Framer Motion)
- Hero section: Fade-in + scale animations
- Card hover effects: Shadow & lift
- Loading states: Skeleton screens
- Navigation: Smooth transitions
- Quiz feedback: Bounce animations

### 4. Responsive Design
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Navbar: Hamburger menu on mobile
- Forms: Single column on mobile, grid on desktop
- Images: Responsive with next/image

### 5. Loading States
- Skeleton loaders for cards
- Progress bars for videos
- Spinners for API calls
- Placeholder animations

---

## File Structure

```
j:/crispy-octo-doodle-1/
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # Root layout with dark mode
│   │   ├── page.tsx                   # Home page
│   │   ├── signup/page.tsx            # Registration
│   │   ├── login/page.tsx             # Login
│   │   ├── courses/page.tsx           # Browse courses
│   │   ├── courses/[id]/page.tsx      # Course detail
│   │   ├── library/page.tsx           # Enrolled courses + AI assistant
│   │   ├── account/page.tsx           # User profile & stats
│   │   ├── adminpanel/
│   │   │   ├── page.tsx               # Admin entry point
│   │   │   ├── teacher/page.tsx       # Teacher dashboard
│   │   │   └── superadmin/page.tsx    # Superadmin dashboard
│   │   └── api/
│   │       ├── auth/                  # Auth routes
│   │       ├── admin/                 # Admin-specific routes
│   │       ├── courses/               # Course CRUD
│   │       ├── quizzes/               # Quiz operations
│   │       ├── videos/                # Video management
│   │       ├── codes/                 # Access code operations
│   │       ├── progress/              # Progress tracking
│   │       ├── ai/                    # AI study plans
│   │       └── analytics/             # Analytics data
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Navbar.tsx             # Main navigation
│   │   │   ├── Footer.tsx             # Footer with admin link
│   │   │   ├── DarkModeToggle.tsx     # Dark mode switcher
│   │   │   ├── Skeleton.tsx           # Loading skeletons
│   │   │   └── Button.tsx             # Reusable button
│   │   ├── home/
│   │   │   ├── HeroSection.tsx        # Animated hero
│   │   │   ├── FeaturesSection.tsx    # Platform features
│   │   │   ├── StatsSection.tsx       # Statistics display
│   │   │   └── CTASection.tsx         # Call-to-action
│   │   ├── courses/
│   │   │   ├── CourseCard.tsx         # Course display
│   │   │   ├── CourseFilters.tsx      # Filter component
│   │   │   └── AccessCodeInput.tsx    # Code entry field
│   │   ├── player/
│   │   │   └── BunnyPlayer.tsx        # Custom video player
│   │   ├── admin/
│   │   │   ├── AdminSidebar.tsx       # Admin nav (desktop rail + mobile drawer)
│   │   │   ├── AdminIcons.tsx         # Shared SVG icon set + SECTION_ICONS map
│   │   │   ├── Charts.tsx             # Dependency-free SVG charts (area/bars/dist)
│   │   │   ├── TeacherOverview.tsx    # Analytics dashboard (KPIs, charts, issues)
│   │   │   ├── TeacherQuizResults.tsx # Quiz scores + retakes
│   │   │   ├── TeacherRequests.tsx    # Grade requests + tickets
│   │   │   ├── TeacherFeedback.tsx    # Student feedback
│   │   │   └── superadmin/            # Superadmin section components
│   │   ├── ai/
│   │   │   ├── StudyPlanCard.tsx      # Plan display
│   │   │   ├── StudyPlanChat.tsx      # Chat interface
│   │   │   └── PlanGenerator.tsx      # Plan creation UI
│   │   └── quiz/
│   │       ├── QuizContainer.tsx      # Quiz wrapper
│   │       ├── QuestionCard.tsx       # Question display
│   │       ├── AnswerSelector.tsx     # Option selection
│   │       ├── TimerDisplay.tsx       # Quiz timer
│   │       └── ResultsDisplay.tsx     # Score feedback
│   ├── lib/
│   │   ├── auth.ts                    # JWT utilities + getSession
│   │   ├── prisma.ts                  # DB client
│   │   ├── video-provider.ts          # resolveEmbedUrl + validateProviderId
│   │   ├── bunny.ts                   # Bunny signed embed URL
│   │   ├── youtube.ts                 # YouTube nocookie embed
│   │   └── motion.ts                  # Framer Motion / format helpers
│   ├── generated/prisma/              # Generated Prisma client (provider: prisma-client)
│   └── types/
│       └── index.ts                   # TypeScript definitions, SUBJECTS, EDUCATIONAL_STAGES
├── prisma/
│   ├── schema.prisma                  # Database schema (SQLite)
│   ├── dev.db                         # Dev SQLite database
│   └── migrations/                    # Database migrations
├── public/
│   └── images/                        # Static assets
├── .env.local                         # Local configuration
├── next.config.ts                     # Next.js configuration
├── tailwind.config.ts                 # Tailwind configuration
├── tsconfig.json                      # TypeScript configuration
└── ARCHITECTURE.md                    # This file
```

---

## API Endpoints Reference

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - Clear session
- `GET /api/auth/me` - Current user info

### Courses
- `GET /api/courses` - List courses (with filters)
- `GET /api/courses/[id]` - Course details with content
- `POST /api/admin/courses` - Create course (teacher)
- `PUT /api/admin/courses/[id]` - Update course (teacher)
- `DELETE /api/admin/courses/[id]` - Delete course (teacher)

### Videos
- `GET  /api/videos/[id]/secure-url` - Resolve provider embed URL (dispatcher)
- `POST /api/videos/[id]/watch` - Open/reuse a 4h watch session (consumes a per-video slot)
- `POST /api/videos/[id]/complete` - Mark the video watched for the student
- `POST /api/admin/folders/[id]/videos` - Add video (provider, id, duration, watch limit) (teacher)
- `PATCH /api/admin/videos/[id]` - Update a video's `maxWatchesPerUser` / `durationMinutes` (teacher)
- `GET  /api/courses/[id]/watch-count` - Remaining watches summary

### Folders
- `GET/POST /api/admin/courses/[id]/folders` - List / create folders (teacher)
- `DELETE   /api/admin/courses/[id]/folders` - Delete folder + cascade content (teacher)

### Quizzes
- `GET /api/quizzes/[id]` - Quiz questions
- `POST /api/quizzes/[id]/submit` - Submit answers
- `POST /api/admin/folders/[id]/quizzes` - Create quiz (teacher)

### Access Codes
- `POST /api/codes` - Redeem code (student)
- `POST /api/admin/codes` - Generate codes (teacher)
- `PUT /api/admin/codes/[id]` - Deactivate code (teacher)

### Progress
- `GET /api/progress` - Student progress summary
- `POST /api/progress` - Mark video watched

### Admin
- `GET /api/admin/teachers` - List teachers (superadmin)
- `POST /api/admin/teachers` - Create teacher (superadmin)
- `DELETE /api/admin/teachers/[id]` - Delete teacher (superadmin)
- `GET /api/admin/analytics?period=7d|30d|90d|all&courseId=` - Teacher analytics (KPIs, series, top/low videos, course breakdown, quiz distribution, issues feed)

### AI Study Plans
- `GET /api/ai/study-plan?date=YYYY-MM-DD` - Get daily plan
- `POST /api/ai/study-plan` - Generate new plan
- `PUT /api/ai/study-plan/[id]` - Update plan status

---

## Environment Variables

```env
# Database (SQLite in dev)
DATABASE_URL=file:./prisma/dev.db

# JWT
JWT_SECRET=your-secret-key-here

# Video providers
# VdoCipher (server-side OTP)
VDOCIPHER_API_SECRET=your-vdocipher-secret
# Bunny Stream (signed embed token)
BUNNY_LIBRARY_ID=your-library-id
BUNNY_API_KEY=your-api-key
BUNNY_TOKEN_AUTHENTICATION_KEY=your-token-key
BUNNY_CDN_HOSTNAME=iframe.mediadelivery.net
# YouTube needs no key (unlisted + nocookie embed)

# AI APIs (with fallback)
AI_PRIMARY_API_KEY=primary-key
AI_PRIMARY_BASE_URL=https://primary-api.example.com
AI_BACKUP_API_KEY=backup-key
AI_BACKUP_BASE_URL=https://backup-api.example.com

# Admin
SUPERADMIN_MASTER_PASSWORD=your-master-password

# Paid-course purchase contact (global WhatsApp number for the buy CTA)
NEXT_PUBLIC_PAYMENT_ACCESS_PASSWORD=+20XXXXXXXXXX

# Site
NEXT_PUBLIC_APP_NAME=Code-UP
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> Note: the student "buy" CTA on a paid course uses the global `NEXT_PUBLIC_PAYMENT_ACCESS_PASSWORD` number, **not** a per-course phone — so the old per-course contact-phone field was removed from the teacher form.

---

## Recent Additions (2026-06)

- **Multi-provider video** — VdoCipher / Bunny / YouTube via `video-provider.ts` dispatcher; teacher picks provider + ID per video.
- **Per-video watch quotas** — `Video.maxWatchesPerUser` (replaces course-wide limit); inline editor in the panel; enforced by `VideoWatchSession`.
- **Inline learn experience** — TOFAS-style split panel at `/courses/[id]/learn`: sequential lock, progress ring, watch-slot bar, 4h session countdown.
- **Mark-complete flow** — `durationMinutes`-based progress bar gates a green finish button at ≥80%; YouTube auto-completes on `ended`.
- **Teacher analytics dashboard** — `/api/admin/analytics` + `TeacherOverview.tsx` with KPIs/deltas, SVG charts, period & course filters, and an issues feed.
- **Mobile-responsive admin** — `AdminSidebar` drawer + hamburger; design-token light/dark fixes across teacher & superadmin panels.
- **Folder delete** — `DELETE /api/admin/courses/[id]/folders` with content cascade.
- Enrollment/code activation now redirects to `/library`.

## Implementation Checklist

- [x] Database schema with all models
- [x] Type definitions
- [x] Dark mode infrastructure (CSS-variable tokens)
- [x] Landing page with hero section
- [x] Courses page with access code input
- [x] Library with AI study assistant
- [x] Teacher admin panel (analytics overview + tabbed course editor)
- [x] Superadmin panel
- [x] Quiz interface
- [x] Skeleton loaders
- [x] Multi-provider secure video playback
- [x] Responsive mobile design (admin drawer)
- [x] Arabic/RTL support
- [ ] AI API fallback mechanism (verify in prod)
- [ ] Security audit

---

## Development Notes

### Running Migrations
```bash
npm run db:migrate
npm run db:generate
```

### Seeding Database
```bash
npm run db:seed
```

### Development Server
```bash
npm run dev
# Runs on http://localhost:3000
```

### Production Build
```bash
npm run build
npm start
```

---

## Security Considerations

1. **Password Security**: All passwords hashed with bcryptjs
2. **Token Security**: JWT tokens in HTTP-only cookies
3. **HTTPS**: Force HTTPS in production
4. **CORS**: Restrict to trusted origins
5. **Rate Limiting**: Implement on auth endpoints
6. **Input Validation**: Sanitize all user inputs
7. **Video Security**: Bunny Stream tokens expire quickly
8. **Admin Panel**: Require master password for superadmin

---

## Performance Optimizations

1. **Image Optimization**: Use next/image for auto-optimization
2. **Code Splitting**: Next.js automatic route-based splitting
3. **Database Indexes**: Added on frequently queried fields
4. **Caching**: Implement Redis for study plans (future)
5. **CDN**: Bunny Stream for video delivery
6. **API Pagination**: Implement limit/offset for large datasets

---

## Future Enhancements

1. Real-time notifications (Socket.io)
2. Teacher-student messaging
3. Group study sessions
4. Video transcripts & notes
5. Advanced analytics &reports
6. Mobile app (React Native)
7. Payment integration (Fawry/HyperPay)
8. Certificate generation
9. Gamification (badges, leaderboards)
10. Multi-language support (English option)

