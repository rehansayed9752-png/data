import { Transition, Variants } from 'framer-motion';

/**
 * Editorial Studio Design Tokens & Animation Presets
 * Calm, human, hand-crafted aesthetic (Scrolltide-style).
 */

export const tokens = {
  colors: {
    bg: '#0e1015',
    surface: {
      base: '#12151c',
      card: '#181c24',
      elevated: '#1f242e',
      hover: '#262c38',
      active: '#2d3442',
    },
    accent: {
      DEFAULT: '#c29b53', // Warm editorial brass/amber, muted and used sparingly
      hover: '#d4ab63',
      subtle: 'rgba(194, 155, 83, 0.12)',
      border: 'rgba(194, 155, 83, 0.45)',
    },
    border: {
      subtle: 'rgba(255, 255, 255, 0.08)',
      medium: 'rgba(255, 255, 255, 0.14)',
      hover: 'rgba(255, 255, 255, 0.22)',
    },
    text: {
      heading: '#f3f4f6',
      body: '#d1d5db',
      muted: '#9ca3af',
      faint: '#6b7280',
    },
  },
  radius: {
    sm: '6px',
    md: '8px',
    lg: '10px',
    xl: '14px',
    full: '9999px',
  },
  spacing: [0, 4, 8, 12, 16, 24, 32, 48] as const,
  fonts: {
    serif: 'Fraunces, Playfair Display, Georgia, serif',
    sans: 'DM Sans, Manrope, -apple-system, sans-serif',
    mono: 'JetBrains Mono, monospace',
  },
  ease: [0.22, 1, 0.36, 1] as const,
};

// Motion Transitions
export const studioTransition: Transition = {
  duration: 0.32,
  ease: tokens.ease,
};

export const springDrawer: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
};

// Reusable Framer Motion Variants
export const headerFadeDown: Variants = {
  hidden: { opacity: 0, y: -8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: tokens.ease },
  },
};

export const panelContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.08,
    },
  },
};

export const panelRise: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: tokens.ease },
  },
};

export const drawerVariants: Variants = {
  hidden: { x: '-100%' },
  visible: {
    x: 0,
    transition: springDrawer,
  },
  exit: {
    x: '-100%',
    transition: { duration: 0.22, ease: tokens.ease },
  },
};

export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.18 } },
};

export const drawerCascade: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.035,
      delayChildren: 0.06,
    },
  },
};

export const drawerItem: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.22, ease: tokens.ease },
  },
};

export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.24, ease: tokens.ease },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: { duration: 0.16, ease: tokens.ease },
  },
};

export const messageSlideUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: tokens.ease },
  },
};

export const chipPop: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.18, ease: tokens.ease },
  },
};

export const buttonHoverLift: Variants = {
  rest: { y: 0, scale: 1 },
  hover: { y: -1, transition: { duration: 0.15, ease: tokens.ease } },
  tap: { scale: 0.98, transition: { duration: 0.1 } },
};

export const crossFade400: Variants = {
  hidden: { opacity: 0, filter: 'blur(3px)' },
  visible: {
    opacity: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.4, ease: tokens.ease },
  },
  exit: {
    opacity: 0,
    filter: 'blur(2px)',
    transition: { duration: 0.25, ease: tokens.ease },
  },
};
