# EdTech Platform - Architecture & Implementation Guide

## Project Overview
A comprehensive EdTech platform targeting Egyptian students (6th Primary to 3rd Secondary) with modern UI/UX, AI-powered study planning, and secure content delivery.

---

## Tech Stack

### Frontend
- **Framework**: Next.js 16.2.4 (React 19.2.4)
- **Styling**: Tailwind CSS 4
- **Animations**: Framer Motion 12.38.0
- **Language**: TypeScript

### Backend
- **Runtime**: Node.js + Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT-based with jose 6.2.3
- **Password Hashing**: bcryptjs

### Video Delivery
- **CDN**: Bunny Stream (650875 - Library ID)
- **Benefits**: Prevents video piracy, secure playback tokens

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
- Bunny Stream integration (stores `bunnyId`)
- Progress tracking per student
- Organized by folder

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

### 3. Video Management (Bunny Stream)

**Configuration:**
- Library ID: 650875
- API Key: (in .env.local as BUNNY_API_KEY)
- Token Auth Key: (in .env.local as BUNNY_TOKEN_KEY)
- CDN Hostname: vz-a3ef6e25-703.b-cdn.net

**Teacher Workflow:**
1. Upload video to Bunny Stream (external)
2. Copy Bunny ID from dashboard
3. Paste ID in admin panel under folder
4. Video appears automatically to students with access

**Playback Security:**
- Custom Bunny Player component
- Secure token generation per request
- No raw MP4 downloads possible

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
- Analytics cards:
  - Total students viewing courses
  - Average quiz scores
  - Video watch statistics
  
- Course management:
  - Create/delete courses
  - Organize folders
  - Add videos & quizzes
  - Manage access codes

- Student management:
  - View all students by course
  - See grades and progress
  - View watched/unwatched videos
  - Deactivate codes

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
/workspaces/Thefake/
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
│   │   │   ├── AdminSidebar.tsx       # Admin navigation
│   │   │   ├── TeacherDashboard.tsx   # Teacher overview
│   │   │   ├── CourseForm.tsx         # Course creation/edit
│   │   │   ├── AccessCodeManager.tsx  # Code generation UI
│   │   │   └── StudentAnalytics.tsx   # Student metrics
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
│   │   ├── auth.ts                    # JWT utilities
│   │   ├── prisma.ts                  # DB client
│   │   ├── ai-service.ts              # AI API integration
│   │   ├── bunny-stream.ts            # Bunny CDN helpers
│   │   └── animations.ts              # Framer Motion presets
│   └── types/
│       └── index.ts                   # TypeScript definitions
├── prisma/
│   ├── schema.prisma                  # Database schema
│   ├── seed.ts                        # Development seed data
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
- `GET /api/videos/[id]/secure-url` - Bunny Stream token
- `POST /api/admin/folders/[id]/videos` - Add video (teacher)

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
- `GET /api/admin/analytics` - System analytics

### AI Study Plans
- `GET /api/ai/study-plan?date=YYYY-MM-DD` - Get daily plan
- `POST /api/ai/study-plan` - Generate new plan
- `PUT /api/ai/study-plan/[id]` - Update plan status

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/thefake

# JWT
JWT_SECRET=your-secret-key-here

# Bunny Stream
BUNNY_LIBRARY_ID=650875
BUNNY_API_KEY=your-api-key
BUNNY_TOKEN_KEY=your-token-key
BUNNY_CDN_HOSTNAME=vz-a3ef6e25-703.b-cdn.net

# AI APIs (with fallback)
AI_PRIMARY_API_KEY=primary-key
AI_PRIMARY_BASE_URL=https://primary-api.example.com
AI_BACKUP_API_KEY=backup-key
AI_BACKUP_BASE_URL=https://backup-api.example.com

# Admin
SUPERADMIN_MASTER_PASSWORD=your-master-password

# Site
NEXT_PUBLIC_APP_NAME=منصة التعليم
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## Implementation Checklist

- [x] Database schema with all models
- [x] Type definitions
- [x] Dark mode infrastructure
- [ ] Enhanced Navbar with animations
- [ ] Landing page with hero section
- [ ] Courses page with access code input
- [ ] Library with AI study assistant
- [ ] Teacher admin panel
- [ ] Superadmin panel
- [ ] Quiz interface
- [ ] Skeleton loaders
- [ ] Custom Bunny player
- [ ] AI API fallback mechanism
- [ ] Responsive mobile design
- [ ] Arabic/RTL support testing
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

