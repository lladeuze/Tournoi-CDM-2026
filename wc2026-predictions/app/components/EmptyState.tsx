import type { ReactNode } from 'react';

export default function EmptyState({
  icon,
  title,
  children,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      {icon && <span className="ic">{icon}</span>}
      <div className="title">{title}</div>
      {children && <div className="small">{children}</div>}
    </div>
  );
}
