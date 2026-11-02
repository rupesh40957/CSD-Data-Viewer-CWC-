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
  size = 36,
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

  const resolvedHeight = height ?? size;

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
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        objectFit: 'contain',
        height: typeof resolvedHeight === 'number' ? `${resolvedHeight}px` : resolvedHeight,
        width: width ? (typeof width === 'number' ? `${width}px` : width) : 'auto',
        maxWidth: '100%',
        ...style,
      }}
    />
  );
}
