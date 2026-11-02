import React from 'react';

export interface CsdLogoProps {
  size?: number | string;
  width?: number | string;
  height?: number | string;
  className?: string;
  color?: string;
  variant?: 'emblem' | 'full';
  style?: React.CSSProperties;
  alt?: string;
}

export function CsdLogo({
  size = 28,
  width,
  height,
  className,
  color,
  variant = 'emblem',
  style,
  alt = 'CSD — Vision of connectivity',
}: CsdLogoProps) {
  const isFull = variant === 'full';
  const isWhite = color === 'white' || color === '#ffffff' || color === '#fff';

  // Aspect ratios:
  // Emblem: 731 x 312 ≈ 2.343 : 1
  // Full logo: 1063 x 405 ≈ 2.625 : 1
  const aspectRatio = isFull ? 2.625 : 2.343;

  const resolvedHeight = height ?? size;
  const resolvedWidth =
    width ?? (typeof size === 'number' ? Math.round(size * aspectRatio) : undefined);

  let src = '/images/csd-emblem.png';
  if (isFull) {
    src = isWhite ? '/images/csd-logo-white.png' : '/images/logo.png';
  } else {
    src = isWhite ? '/images/csd-emblem-white.png' : '/images/csd-emblem.png';
  }

  return (
    <img
      src={src}
      alt={alt}
      width={typeof resolvedWidth === 'number' ? resolvedWidth : undefined}
      height={typeof resolvedHeight === 'number' ? resolvedHeight : undefined}
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        objectFit: 'contain',
        width: typeof resolvedWidth === 'number' ? `${resolvedWidth}px` : resolvedWidth,
        height: typeof resolvedHeight === 'number' ? `${resolvedHeight}px` : resolvedHeight,
        ...style,
      }}
    />
  );
}
