// Cadence — Album art display component
// Renders album artwork with fallback placeholder

interface AlbumArtProps {
  src: string | null;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  rounded?: boolean;
}

/** Size mappings in pixels */
const SIZE_MAP: Record<NonNullable<AlbumArtProps['size']>, number> = {
  sm: 40,
  md: 56,
  lg: 128,
  xl: 256,
};

export default function AlbumArt({ src, alt, size = 'md', className = '', rounded = false }: AlbumArtProps) {
  const dimension = SIZE_MAP[size];

  // TODO: Implement album art with loading state, error fallback, and cached asset URL
  return (
    <div
      className={`album-art album-art-${size} ${rounded ? 'rounded-full' : 'rounded-lg'} ${className}`}
      style={{ width: dimension, height: dimension }}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          width={dimension}
          height={dimension}
          className="object-cover w-full h-full"
          loading="lazy"
        />
      ) : (
        <div className="album-art-placeholder flex items-center justify-center w-full h-full bg-surface-elevated">
          {/* TODO: Add music note SVG icon as placeholder */}
          <span className="text-text-muted text-xs">No Art</span>
        </div>
      )}
    </div>
  );
}
