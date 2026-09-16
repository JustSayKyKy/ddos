import type { ReactNode } from 'react';

interface ScreenShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function ScreenShell({ eyebrow, title, description, children }: ScreenShellProps) {
  return (
    <div className="screen-shell">
      <header className="screen-header">
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </header>
      {children}
    </div>
  );
}
