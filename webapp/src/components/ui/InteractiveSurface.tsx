import type { ReactNode, CSSProperties, MouseEventHandler, Ref, RefObject } from 'react';
import { motion } from 'framer-motion';
import { Link, type LinkProps } from 'react-router-dom';
import { DANCE_SPRING_HEAVY } from '../../lib/transitionConfig';

// Create motion-compatible Link
const MotionLink = motion.create(Link);

type SupportedElement = 'div' | 'article' | 'section' | 'button' | 'a' | 'span' | 'link' | 'aside';

interface InteractiveSurfaceProps {
  as?: SupportedElement;
  to?: LinkProps['to'];
  hoverLift?: number;
  hoverScale?: number;
  tapScale?: number;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: MouseEventHandler;
  'aria-label'?: string;
  'aria-pressed'?: boolean;
  'aria-expanded'?: boolean;
  'aria-controls'?: string;
  role?: string;
  type?: 'button' | 'submit' | 'reset';
  id?: string;
  title?: string;
  ref?: Ref<HTMLElement> | RefObject<HTMLElement | null>;
}

/**
 * InteractiveSurface
 * Framer Motion controls transform using a heavy spring preset.
 * CSS should handle border/shadow/sheen only (no transform rules).
 */
export function InteractiveSurface({
  as = 'div',
  to,
  className,
  children,
  style,
  hoverLift = 4,
  hoverScale = 1.02,
  tapScale = 0.995,
  onClick,
  'aria-label': ariaLabel,
  'aria-pressed': ariaPressed,
  'aria-expanded': ariaExpanded,
  'aria-controls': ariaControls,
  role,
  type,
  id,
  title,
  ref,
}: InteractiveSurfaceProps) {
  const hoverProps = {
    y: -hoverLift,
    scale: hoverScale,
  };

  const tapProps = {
    y: -(hoverLift * 0.5),
    scale: tapScale,
  };

  const commonProps = {
    className,
    style,
    whileHover: hoverProps,
    whileTap: tapProps,
    transition: DANCE_SPRING_HEAVY,
    onClick,
    'aria-label': ariaLabel,
    role,
    id,
    title,
    ref: ref as any,
  };

  // Handle Link special case
  if (as === 'link' && to) {
    return (
      <MotionLink to={to} {...commonProps}>
        {children}
      </MotionLink>
    );
  }

  if (as === 'button') {
    return (
      <motion.button
        type={type || 'button'}
        aria-pressed={ariaPressed}
        aria-expanded={ariaExpanded}
        aria-controls={ariaControls}
        {...commonProps}
      >
        {children}
      </motion.button>
    );
  }

  if (as === 'a') {
    return (
      <motion.a {...commonProps}>
        {children}
      </motion.a>
    );
  }

  if (as === 'article') {
    return (
      <motion.article {...commonProps}>
        {children}
      </motion.article>
    );
  }

  if (as === 'section') {
    return (
      <motion.section {...commonProps}>
        {children}
      </motion.section>
    );
  }

  if (as === 'span') {
    return (
      <motion.span {...commonProps}>
        {children}
      </motion.span>
    );
  }

  if (as === 'aside') {
    return (
      <motion.aside {...commonProps}>
        {children}
      </motion.aside>
    );
  }

  // Default: div
  return (
    <motion.div {...commonProps}>
      {children}
    </motion.div>
  );
}
