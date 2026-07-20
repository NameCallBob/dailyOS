import type { ReactNode, SVGProps } from "react";

/**
 * 極簡線性圖示集，對應 lib/nav.ts 的 icon key。
 * 全部使用 currentColor + stroke，避免額外圖示套件依賴。
 */
export type IconKey =
  | "dashboard"
  | "tasks"
  | "calendar"
  | "focus"
  | "notes"
  | "habits"
  | "body"
  | "nutrition"
  | "sleep"
  | "symptoms"
  | "meds"
  | "workouts"
  | "rehab"
  | "timeline"
  | "settings"
  | "quick-add"
  | "offline"
  | "menu"
  | "close"
  | "check"
  | "chevron-down";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 20, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

const paths: Record<IconKey, ReactNode> = {
  dashboard: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1" />
      <rect x="13.5" y="3.5" width="7" height="4.5" rx="1" />
      <rect x="13.5" y="10.5" width="7" height="10" rx="1" />
      <rect x="3.5" y="13" width="7" height="7.5" rx="1" />
    </>
  ),
  tasks: (
    <>
      <path d="M4 6h1.6l1.2 1.6L9.5 5" />
      <path d="M4 12h1.6l1.2 1.6L9.5 11" />
      <path d="M4 18h1.6l1.2 1.6L9.5 17" />
      <path d="M13 6h7" />
      <path d="M13 12h7" />
      <path d="M13 18h7" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="1.5" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
    </>
  ),
  focus: (
    <>
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  notes: (
    <>
      <path d="M6 3.5h9l3.5 3.5V20.5H6z" />
      <path d="M15 3.5V7h3.5" />
      <path d="M8.5 12h7" />
      <path d="M8.5 15.5h7" />
    </>
  ),
  habits: (
    <>
      <path d="M4 12a8 8 0 1 1 8 8" />
      <path d="M4 12v5h5" />
      <path d="M12 8v4l3 2" />
    </>
  ),
  body: (
    <>
      <circle cx="12" cy="5" r="2.25" />
      <path d="M8 21v-6.5L6 12l2-5h8l2 5-2 2.5V21" />
    </>
  ),
  nutrition: (
    <>
      <path d="M6 3v6a2 2 0 0 0 2 2v10" />
      <path d="M6 3v6" />
      <path d="M9 3v6" />
      <path d="M17 3c-2 1-2.5 3-2.5 5s.7 3 2.5 3v10" />
    </>
  ),
  sleep: (
    <>
      <path d="M15 4a8 8 0 1 0 6.2 13A8.5 8.5 0 0 1 15 4z" />
    </>
  ),
  symptoms: (
    <>
      <path d="M12 3.5 20.5 19h-17z" />
      <path d="M12 9.5v4" />
      <circle cx="12" cy="16.2" r="0.6" fill="currentColor" stroke="none" />
    </>
  ),
  meds: (
    <>
      <rect x="3.5" y="9.5" width="17" height="6" rx="3" transform="rotate(-30 12 12.5)" />
      <path d="M9.7 8.3 15.2 16.7" />
    </>
  ),
  workouts: (
    <>
      <path d="M4 12h3" />
      <path d="M17 12h3" />
      <path d="M7 8v8" />
      <path d="M17 8v8" />
      <path d="M7 12h10" />
    </>
  ),
  rehab: (
    <>
      <circle cx="7" cy="6" r="2" />
      <path d="M7 8v5l4 2 3 6" />
      <path d="M7 13l-3 6" />
      <path d="M11 15l5-2 2-4" />
    </>
  ),
  timeline: (
    <>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
      <circle cx="9" cy="6" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="10" cy="18" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V20a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H4a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H10a1.7 1.7 0 0 0 1-1.6V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V10a1.7 1.7 0 0 0 1.6 1H20a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1z" />
    </>
  ),
  "quick-add": (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  offline: (
    <>
      <path d="M3 3l18 18" />
      <path d="M8.5 8.8A9 9 0 0 1 21 9.5" />
      <path d="M5 12.5a9 9 0 0 1 2-1.6" />
      <path d="M8.3 15.8a4.7 4.7 0 0 1 5.6-.6" />
      <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </>
  ),
  close: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  "chevron-down": <path d="M6 9l6 6 6-6" />,
};

export function NavIcon({ name, size = 20, ...props }: IconProps & { name: IconKey }) {
  return (
    <Base size={size} {...props}>
      {paths[name]}
    </Base>
  );
}
