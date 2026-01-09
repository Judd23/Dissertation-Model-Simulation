import { useEffect, useRef } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useTransition } from '../../context/TransitionContext';
import { DANCE_SPRING_HEAVY } from '../../config/transitionConfig';

interface SharedElementProps extends HTMLMotionProps<'div'> {
  id: string;
  children: React.ReactNode;
}

export default function SharedElement({
  id,
  children,
  ...motionProps
}: SharedElementProps) {
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { registerSharedElement, unregisterSharedElement, reducedMotion } =
    useTransition();

  // Register element position on mount and route change
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const updateRect = () => {
      const rect = element.getBoundingClientRect();
      registerSharedElement(id, rect, location.pathname);
    };

    updateRect();

    // Update on resize
    const resizeObserver = new ResizeObserver(updateRect);
    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
      unregisterSharedElement(id);
    };
  }, [id, location.pathname, registerSharedElement, unregisterSharedElement]);

  if (reducedMotion) {
    return <div ref={ref}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      layoutId={id}
      layout
      transition={{
        ...DANCE_SPRING_HEAVY,
        layout: DANCE_SPRING_HEAVY,
      }}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
}
