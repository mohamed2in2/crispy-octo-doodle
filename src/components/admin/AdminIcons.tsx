"use client";

/**
 * Single coherent admin icon set — stroke-based, 24×24, currentColor.
 * Replaces the emoji vocabulary across the admin surfaces for a consistent,
 * premium look. Keyed by a stable name so AdminSidebar can map section ids.
 */

type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function IconDashboard({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

export function IconBook({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  );
}

export function IconClipboard({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function IconPlus({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconKey({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="M10.5 12.5L20 3M16 7l3 3M14 9l2 2" />
    </svg>
  );
}

export function IconUsers({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

export function IconTicket({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M3 9a3 3 0 010-6h18a3 3 0 010 6 3 3 0 010 6H3a3 3 0 010-6z" />
      <path d="M12 5v.01M12 12v.01M12 19v.01" />
    </svg>
  );
}

export function IconChat({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
    </svg>
  );
}

export function IconChart({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M3 3v18h18" />
      <path d="M18 9l-5 5-3-3-4 4" />
    </svg>
  );
}

export function IconLogout({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

export function IconTrash({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function IconFolder({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M4 4h5l2 3h9a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z" />
    </svg>
  );
}

export function IconVideo({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <rect x="2" y="5" width="14" height="14" rx="2" />
      <path d="M16 9l6-3v12l-6-3" />
    </svg>
  );
}

export function IconFile({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

export function IconLink({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  );
}

export function IconSettings({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

export function IconTag({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
      <path d="M7 7h.01" />
    </svg>
  );
}

export function IconGlobe({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  );
}

export function IconMenu({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M3 12h18M3 6h18M3 18h18" />
    </svg>
  );
}

export function IconClose({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export function IconChevronLeft({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export function IconShield({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export function IconClock({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

export function IconEye({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// Section-id → icon, used by AdminSidebar. Falls back to a dot if unmapped.
export const SECTION_ICONS: Record<string, (p: IconProps) => React.ReactElement> = {
  dashboard: IconDashboard,
  overview: IconChart,
  "my-page": IconGlobe,
  courses: IconBook,
  "quiz-results": IconClipboard,
  "create-course": IconPlus,
  create: IconPlus,
  codes: IconKey,
  students: IconUsers,
  "deleted-students": IconUsers,
  teachers: IconUsers,
  "deleted-teachers": IconTrash,
  "staff-accounts": IconUsers,
  "daily-exams": IconChart,
  logs: IconFile,
  errors: IconShield,
  requests: IconTicket,
  feedback: IconChat,
};
