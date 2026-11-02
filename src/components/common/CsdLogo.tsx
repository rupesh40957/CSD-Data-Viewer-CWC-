import React from 'react';

interface CsdLogoProps {
  size?: number | string;
  width?: number | string;
  height?: number | string;
  className?: string;
  color?: string;
  style?: React.CSSProperties;
}

export function CsdLogo({
  size = 28,
  width,
  height,
  className,
  color = 'currentColor',
  style,
}: CsdLogoProps) {
  // Original aspect ratio: 131 x 81 (roughly 1.618 : 1)
  const logoWidth = width ?? (typeof size === 'number' ? size * 1.5 : size);
  const logoHeight = height ?? size;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 131 81"
      width={logoWidth}
      height={logoHeight}
      fill={color}
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-label="CSD Logo"
      role="img"
    >
      <path
        d="M37 2h11v1h-11z M86 2h11v1h-11z M31 3h23v1h-23z M62 3h41v1h-41z M27 4h80v1h-80z M25 5h84v1h-84z M22 6h89v1h-89z M20 7h92v1h-92z M19 8h93v1h-93z M18 9h96v1h-96z M16 10h99v1h-99z M15 11h101v1h-101z M14 12h104v1h-104z M13 13h106v1h-106z M12 14h29v1h-29z M46 14h74v1h-74z M11 15h25v1h-25z M52 15h31v1h-31z M94 15h27v1h-27z M11 16h23v1h-23z M55 16h27v1h-27z M97 16h24v1h-24z M10 17h22v1h-22z M57 17h24v1h-24z M99 17h23v1h-23z M9 18h21v1h-21z M58 18h23v1h-23z M101 18h22v1h-22z M9 19h20v1h-20z M58 19h22v5h-22z M103 19h21v1h-21z M8 20h20v1h-20z M104 20h20v1h-20z M8 21h19v1h-19z M105 21h20v1h-20z M7 22h19v2h-19z M106 22h19v1h-19z M107 23h19v1h-19z M6 24h19v2h-19z M58 24h23v2h-23z M108 24h18v1h-18z M109 25h17v1h-17z M6 26h18v1h-18z M58 26h25v1h-25z M109 26h18v1h-18z M5 27h19v1h-19z M58 27h26v1h-26z M110 27h17v2h-17z M5 28h18v3h-18z M58 28h27v1h-27z M58 29h29v1h-29z M110 29h18v2h-18z M58 30h31v1h-31z M4 31h19v1h-19z M58 31h34v1h-34z M111 31h17v3h-17z M4 32h18v7h-18z M58 32h35v1h-35z M58 33h38v1h-38z M58 34h41v1h-41z M112 34h16v6h-16z M58 35h43v1h-43z M58 36h45v1h-45z M58 37h47v1h-47z M58 38h49v1h-49z M4 39h17v2h-17z M58 39h51v1h-51z M58 40h70v3h-70z M4 41h18v6h-18z M58 43h18v2h-18z M79 43h49v1h-49z M81 44h47v1h-47z M58 45h17v17h-17z M84 45h44v1h-44z M86 46h42v1h-42z M4 47h19v5h-19z M89 47h39v1h-39z M91 48h37v1h-37z M93 49h35v1h-35z M95 50h32v1h-32z M96 51h31v1h-31z M5 52h19v3h-19z M97 52h30v1h-30z M98 53h28v1h-28z M99 54h27v2h-27z M5 55h20v1h-20z M6 56h19v1h-19z M100 56h26v1h-26z M6 57h20v1h-20z M100 57h25v1h-25z M7 58h20v1h-20z M100 58h24v1h-24z M7 59h21v1h-21z M99 59h25v1h-25z M8 60h21v1h-21z M99 60h24v1h-24z M8 61h22v1h-22z M98 61h24v1h-24z M8 62h23v1h-23z M57 62h18v1h-18z M97 62h25v1h-25z M9 63h25v1h-25z M55 63h20v1h-20z M96 63h25v1h-25z M10 64h27v1h-27z M52 64h25v1h-25z M92 64h28v1h-28z M11 65h108v1h-108z M12 66h106v1h-106z M12 67h105v1h-105z M13 68h103v1h-103z M14 69h101v1h-101z M16 70h97v1h-97z M17 71h94v1h-94z M18 72h91v1h-91z M20 73h87v1h-87z M23 74h81v1h-81z M25 75h77v1h-77z M27 76h29v1h-29z M59 76h40v1h-40z M37 77h11v1h-11z M81 77h7v1h-7z"
      />
    </svg>
  );
}
