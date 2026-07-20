import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "var(--color-ink)",
          soft: "var(--color-ink-soft)",
          muted: "var(--color-ink-muted)",
          faint: "var(--color-ink-faint)",
        },
        paper: {
          DEFAULT: "var(--color-paper)",
          raised: "var(--color-paper-raised)",
          sunken: "var(--color-paper-sunken)",
        },
        line: {
          DEFAULT: "var(--color-line)",
          strong: "var(--color-line-strong)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          soft: "var(--color-accent-soft)",
          ink: "var(--color-accent-ink)",
        },
        danger: {
          DEFAULT: "var(--color-danger)",
          soft: "var(--color-danger-soft)",
        },
        success: {
          DEFAULT: "var(--color-success)",
          soft: "var(--color-success-soft)",
        },
        warning: {
          DEFAULT: "var(--color-warning)",
          soft: "var(--color-warning-soft)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
        mono: ["var(--font-mono)"],
      },
      fontSize: {
        display: ["var(--fs-display)", { lineHeight: "var(--lh-display)", letterSpacing: "var(--ls-display)", fontWeight: "var(--fw-display)" }],
        h1: ["var(--fs-h1)", { lineHeight: "var(--lh-h1)", letterSpacing: "var(--ls-h1)", fontWeight: "var(--fw-h1)" }],
        h2: ["var(--fs-h2)", { lineHeight: "var(--lh-h2)", letterSpacing: "var(--ls-h2)", fontWeight: "var(--fw-h2)" }],
        h3: ["var(--fs-h3)", { lineHeight: "var(--lh-h3)", letterSpacing: "var(--ls-h3)", fontWeight: "var(--fw-h3)" }],
        body: ["var(--fs-body)", { lineHeight: "var(--lh-body)", letterSpacing: "var(--ls-body)" }],
        caption: ["var(--fs-caption)", { lineHeight: "var(--lh-caption)", letterSpacing: "var(--ls-caption)" }],
        label: ["var(--fs-label)", { lineHeight: "var(--lh-label)", letterSpacing: "var(--ls-label)", fontWeight: "var(--fw-label)" }],
        mono: ["var(--fs-mono)", { lineHeight: "var(--lh-mono)" }],
        numeric: ["var(--fs-numeric)", { lineHeight: "var(--lh-numeric)", fontWeight: "var(--fw-numeric)" }],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },
      spacing: {
        gutter: "var(--space-gutter)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { transform: "translateY(8px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "fade-in": "fade-in 150ms ease-out",
        "slide-up": "slide-up 200ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
