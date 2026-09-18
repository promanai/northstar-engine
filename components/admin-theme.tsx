'use client';

import { useLayoutEffect } from 'react';

/** Include portaled menus and dialogs; restore the public theme on route exit. */
export function AdminTheme({ children }: { children: React.ReactNode }) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const previous = root.getAttribute('data-admin-ui');
    root.setAttribute('data-admin-ui', '');
    return () => {
      if (previous === null) root.removeAttribute('data-admin-ui');
      else root.setAttribute('data-admin-ui', previous);
    };
  }, []);
  return <div className="admin-theme">{children}</div>;
}
