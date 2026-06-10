/* Lightweight shimmer placeholders for loading states. */

export function Skeleton({
  height = 16,
  width = '100%',
  radius = 8,
  style,
}: {
  height?: number | string;
  width?: number | string;
  radius?: number;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className="skeleton"
      style={{ height, width, borderRadius: radius, ...style }}
    />
  );
}

/** A few stacked skeleton cards, for page-level loading. */
export function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card" style={{ display: 'grid', gap: 12 }}>
          <Skeleton height={14} width="40%" />
          <Skeleton height={48} radius={12} />
          <Skeleton height={14} width="70%" />
        </div>
      ))}
    </div>
  );
}
