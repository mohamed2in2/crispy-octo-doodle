-- Subscriber-only teacher Q&A and live-session companion tables.
CREATE TABLE "CommunityQuestion" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunityQuestion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunityQuestion_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "CommunityQuestion_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE INDEX "CommunityQuestion_studentId_createdAt_idx" ON "CommunityQuestion"("studentId", "createdAt");
CREATE INDEX "CommunityQuestion_teacherId_createdAt_idx" ON "CommunityQuestion"("teacherId", "createdAt");

CREATE TABLE "CommunityAnswer" (
  "id" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunityAnswer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunityAnswer_questionId_key" UNIQUE ("questionId"),
  CONSTRAINT "CommunityAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "CommunityQuestion"("id") ON DELETE CASCADE,
  CONSTRAINT "CommunityAnswer_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE INDEX "CommunityAnswer_teacherId_idx" ON "CommunityAnswer"("teacherId");

CREATE TABLE "TeacherLiveSession" (
  "id" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "joinUrl" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeacherLiveSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TeacherLiveSession_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE INDEX "TeacherLiveSession_teacherId_startsAt_idx" ON "TeacherLiveSession"("teacherId", "startsAt");
CREATE INDEX "TeacherLiveSession_startsAt_endsAt_idx" ON "TeacherLiveSession"("startsAt", "endsAt");
