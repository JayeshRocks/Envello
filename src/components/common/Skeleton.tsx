import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

/**
 * Base shimmering skeleton box with left-to-right fluid flash animation.
 * Used across the application to replace raw text loaders or zero amounts with sleek placeholders.
 */
export const Skeleton: React.FC<SkeletonProps> = ({ className = '', ...props }) => {
  return (
    <div
      role="status"
      aria-label="Loading content..."
      className={`skeleton-shimmer rounded-md ${className}`}
      {...props}
    />
  );
};

/**
 * Shimmering card container matching glassmorphic cards.
 */
export const SkeletonCard: React.FC<{ className?: string; children?: React.ReactNode }> = ({
  className = '',
  children,
}) => {
  return (
    <div
      className={`glass-card rounded-2xl p-5 border border-white/5 space-y-3.5 relative overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
};

/**
 * Shimmering card skeleton for the 6 Financial Pillars.
 */
export const SkeletonPillar: React.FC<{ title: string; number: number }> = ({ title, number }) => {
  return (
    <div className="glass-card rounded-2xl p-5 space-y-3 border border-white/5 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          {number}. {title}
        </span>
        <Skeleton className="w-9 h-9 rounded-xl" />
      </div>
      <div className="space-y-2 py-1">
        <Skeleton className="h-7 w-36 rounded-lg" />
        <Skeleton className="h-3.5 w-28 rounded-md" />
      </div>
    </div>
  );
};

/**
 * Reusable multi-column card grid skeleton for Cards, Debts, FDs, Recurring, and EMIs.
 */
export const SkeletonCardsGrid: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="glass-card rounded-2xl p-5 border border-white/10 space-y-4 relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Skeleton className="w-9 h-9 rounded-xl" />
              <div className="space-y-1.5">
                <Skeleton className="w-28 h-4 rounded" />
                <Skeleton className="w-16 h-3 rounded" />
              </div>
            </div>
            <Skeleton className="w-14 h-5 rounded-full" />
          </div>
          <div className="space-y-2 py-1">
            <Skeleton className="w-36 h-7 rounded-lg" />
            <Skeleton className="w-full h-2 rounded-full" />
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <Skeleton className="w-24 h-3.5 rounded" />
            <Skeleton className="w-16 h-3.5 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Shimmering row skeleton for Transaction Ledger.
 */
export const SkeletonTableRow: React.FC = () => {
  return (
    <tr className="border-b border-white/5">
      <td className="py-4 px-4"><Skeleton className="w-16 h-3.5 rounded" /></td>
      <td className="py-4 px-4"><Skeleton className="w-32 h-3.5 rounded" /></td>
      <td className="py-4 px-4"><Skeleton className="w-14 h-3.5 rounded-full" /></td>
      <td className="py-4 px-4"><Skeleton className="w-24 h-3.5 rounded" /></td>
      <td className="py-4 px-4 text-right"><Skeleton className="w-20 h-3.5 rounded ml-auto" /></td>
      <td className="py-4 pr-6 pl-2 text-center"><Skeleton className="w-8 h-3.5 rounded mx-auto" /></td>
    </tr>
  );
};
