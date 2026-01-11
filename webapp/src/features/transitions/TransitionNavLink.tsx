import type { MouseEvent } from 'react';
import { NavLink, type NavLinkProps } from 'react-router-dom';
import { usePageTransition } from '../../lib/hooks';

type TransitionType = 'particles' | 'morph' | 'auto' | 'none';

interface TransitionNavLinkProps extends NavLinkProps {
  transition?: TransitionType;
}

function isModifiedEvent(event: MouseEvent<HTMLAnchorElement>) {
  return event.metaKey || event.altKey || event.ctrlKey || event.shiftKey;
}

export default function TransitionNavLink({
  to,
  transition,
  replace,
  onClick,
  ...props
}: TransitionNavLinkProps) {
  const { navigate } = usePageTransition();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (event.button !== 0 || isModifiedEvent(event)) return;

    // Convert To object to string path if needed
    const path = typeof to === 'string' ? to : to.pathname ?? '';
    if (!path) return;

    event.preventDefault();
    void navigate(path, { replace, transition });
  };

  return (
    <NavLink
      to={to}
      replace={replace}
      onClick={handleClick}
      {...props}
    />
  );
}
