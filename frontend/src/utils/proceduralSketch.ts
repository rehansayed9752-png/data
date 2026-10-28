import { FacialStateJSON, RenderStyle } from '../types/forensic';

/**
 * Generates an authentic forensic composite sketch SVG data URL
 * based on the 14-point FacialStateJSON and chosen RenderStyle.
 * Emulates 2B/4B graphite pencil cross-hatching on textured cartridge paper.
 */
export function generateForensicSketchDataUrl(
  state: FacialStateJSON,
  style: RenderStyle = 'forensic_graphite',
  seed: number = 849204,
  iteration: number = 1
): string {
  const isCharcoal = style === 'charcoal_shaded';
  const isPhoto = style === 'photorealistic_id';

  const paperBg = isPhoto
    ? '#1c202a'
    : isCharcoal
    ? '#141517'
    : '#12141a';

  const strokeColor = isPhoto
    ? '#d8e2ec'
    : isCharcoal
    ? '#f2f3f5'
    : '#e2e6eb';

  const hatchOpacity = isCharcoal ? 0.35 : 0.22;
  const lineWeight = isCharcoal ? 2.2 : 1.4;

  // Determine anatomical geometry modifiers based on state strings
  const isSquareJaw = state.jawline_chin.toLowerCase().includes('square') || state.jawline_chin.toLowerCase().includes('wide');
  const isNarrowChin = state.jawline_chin.toLowerCase().includes('narrow') || state.jawline_chin.toLowerCase().includes('pointed');
  const hasCheekScar = state.scars_marks_tattoos.toLowerCase().includes('scar');
  const hasEyebrowScar = state.scars_marks_tattoos.toLowerCase().includes('eyebrow');
  const hasGlasses = state.accessories.toLowerCase().includes('glasses');
  const hasBeard = state.facial_hair.toLowerCase().includes('beard') || state.facial_hair.toLowerCase().includes('stubble');
  const hasMustache = state.facial_hair.toLowerCase().includes('mustache');
  const isBushyBrows = state.eyebrows.toLowerCase().includes('bushy') || state.eyebrows.toLowerCase().includes('thick');
  const isNarrowEyes = state.eyes.toLowerCase().includes('narrow') || state.eyes.toLowerCase().includes('almond');
  const isHookedNose = state.nose.toLowerCase().includes('hooked') || state.nose.toLowerCase().includes('crooked');

  // Jaw polygon coordinates
  const jawLeftX = isSquareJaw ? 115 : isNarrowChin ? 130 : 120;
  const jawRightX = isSquareJaw ? 285 : isNarrowChin ? 270 : 280;
  const chinY = isNarrowChin ? 370 : 360;
  const chinWidth = isSquareJaw ? 35 : isNarrowChin ? 14 : 24;

  // Eyes geometry
  const eyeWidth = isNarrowEyes ? 28 : 34;
  const eyeHeight = isNarrowEyes ? 10 : 15;

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 480" width="100%" height="100%">
  <defs>
    <!-- Paper texture & pencil grain filter -->
    <filter id="pencilTexture-${seed}-${iteration}" x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="${isCharcoal ? 3.5 : 2.0}" xChannelSelector="R" yChannelSelector="G" />
    </filter>

    <radialGradient id="vignette-${seed}" cx="50%" cy="50%" r="50%">
      <stop offset="60%" stop-color="${paperBg}" stop-opacity="0" />
      <stop offset="100%" stop-color="#050608" stop-opacity="0.85" />
    </radialGradient>

    <pattern id="hatching-${seed}" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="8" stroke="${strokeColor}" stroke-width="0.7" opacity="${hatchOpacity}" />
    </pattern>

    <pattern id="crossHatch-${seed}" width="8" height="8" patternTransform="rotate(-45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="8" stroke="${strokeColor}" stroke-width="0.7" opacity="${hatchOpacity * 0.7}" />
    </pattern>
  </defs>

  <!-- Background cartridge paper -->
  <rect width="100%" height="100%" fill="${paperBg}" />
  <rect width="100%" height="100%" fill="url(#vignette-${seed})" />

  <g filter="url(#pencilTexture-${seed}-${iteration})">
    <!-- Neck & Shoulders -->
    <path d="M 140 350 Q 120 420 70 470 L 330 470 Q 280 420 260 350 Z" 
          fill="none" stroke="${strokeColor}" stroke-width="${lineWeight}" opacity="0.6" />
    <path d="M 145 365 Q 200 395 255 365" fill="none" stroke="${strokeColor}" stroke-width="1.2" opacity="0.4" />

    <!-- Cranial Contour / Head Silhouette -->
    <path d="M 120 180 
             C 105 100, 295 100, 280 180
             C 285 240, ${jawRightX} 290, ${200 + chinWidth} ${chinY}
             Q 200 ${chinY + 8} ${200 - chinWidth} ${chinY}
             C ${jawLeftX} 290, 115 240, 120 180 Z" 
          fill="${isPhoto ? '#262c3b' : 'none'}" 
          stroke="${strokeColor}" stroke-width="${lineWeight + 0.6}" stroke-linecap="round" />

    <!-- Cheek & Jaw Shading Hatching -->
    <path d="M 122 230 C 130 280, 150 320, 185 350 L 160 355 C 135 320, 120 270, 118 230 Z" 
          fill="url(#hatching-${seed})" />
    <path d="M 278 230 C 270 280, 250 320, 215 350 L 240 355 C 265 320, 280 270, 282 230 Z" 
          fill="url(#hatching-${seed})" />

    <!-- Ears -->
    <path d="M 118 190 Q 95 215 116 250" fill="none" stroke="${strokeColor}" stroke-width="${lineWeight}" />
    <path d="M 112 205 Q 102 220 114 235" fill="none" stroke="${strokeColor}" stroke-width="0.9" opacity="0.5" />
    <path d="M 282 190 Q 305 215 284 250" fill="none" stroke="${strokeColor}" stroke-width="${lineWeight}" />
    <path d="M 288 205 Q 298 220 286 235" fill="none" stroke="${strokeColor}" stroke-width="0.9" opacity="0.5" />

    <!-- Hair Silhouette -->
    <path d="M 115 170 Q 110 90 200 80 Q 290 90 285 170 Q 255 125 200 125 Q 145 125 115 170 Z" 
          fill="${isCharcoal ? strokeColor : 'url(#crossHatch-' + seed + ')'}" 
          stroke="${strokeColor}" stroke-width="${lineWeight}" opacity="${isCharcoal ? 0.7 : 0.85}" />

    <!-- Eyebrows -->
    <path d="M 140 185 Q 165 ${isBushyBrows ? '172' : '178'} 190 184" 
          fill="none" stroke="${strokeColor}" stroke-width="${isBushyBrows ? '4.5' : '2.2'}" stroke-linecap="round" />
    <path d="M 210 184 Q 235 ${isBushyBrows ? '172' : '178'} 260 185" 
          fill="none" stroke="${strokeColor}" stroke-width="${isBushyBrows ? '4.5' : '2.2'}" stroke-linecap="round" />

    <!-- Eyebrow scar if flagged -->
    ${hasEyebrowScar ? `
      <line x1="240" y1="174" x2="244" y2="190" stroke="${paperBg}" stroke-width="3" />
      <line x1="241" y1="172" x2="243" y2="192" stroke="${strokeColor}" stroke-width="1.2" />
    ` : ''}

    <!-- Eyes (Almond / Narrow) -->
    <!-- Left Eye -->
    <path d="M ${165 - eyeWidth / 2} 205 Q 165 ${205 - eyeHeight} ${165 + eyeWidth / 2} 205 Q 165 ${205 + eyeHeight} ${165 - eyeWidth / 2} 205 Z" 
          fill="none" stroke="${strokeColor}" stroke-width="${lineWeight}" />
    <circle cx="165" cy="205" r="5" fill="${strokeColor}" />
    <circle cx="163" cy="203" r="1.5" fill="${paperBg}" />
    <path d="M ${165 - eyeWidth / 2 - 4} 198 Q 165 194 ${165 + eyeWidth / 2 + 4} 198" 
          fill="none" stroke="${strokeColor}" stroke-width="0.9" opacity="0.6" />
    <!-- Periorbital shadow -->
    <path d="M ${165 - eyeWidth / 2} 212 Q 165 217 ${165 + eyeWidth / 2} 212" 
          fill="none" stroke="${strokeColor}" stroke-width="0.8" opacity="0.4" />

    <!-- Right Eye -->
    <path d="M ${235 - eyeWidth / 2} 205 Q 235 ${205 - eyeHeight} ${235 + eyeWidth / 2} 205 Q 235 ${205 + eyeHeight} ${235 - eyeWidth / 2} 205 Z" 
          fill="none" stroke="${strokeColor}" stroke-width="${lineWeight}" />
    <circle cx="235" cy="205" r="5" fill="${strokeColor}" />
    <circle cx="233" cy="203" r="1.5" fill="${paperBg}" />
    <path d="M ${235 - eyeWidth / 2 - 4} 198 Q 235 194 ${235 + eyeWidth / 2 + 4} 198" 
          fill="none" stroke="${strokeColor}" stroke-width="0.9" opacity="0.6" />
    <!-- Periorbital shadow -->
    <path d="M ${235 - eyeWidth / 2} 212 Q 235 217 ${235 + eyeWidth / 2} 212" 
          fill="none" stroke="${strokeColor}" stroke-width="0.8" opacity="0.4" />

    <!-- Nose (Bridge, tip, nostrils) -->
    <path d="M 197 195 L 196 238 ${isHookedNose ? 'Q 192 250 196 256' : 'L 196 256'}" 
          fill="none" stroke="${strokeColor}" stroke-width="1.3" opacity="0.75" />
    <path d="M 188 257 Q 200 ${isHookedNose ? '265' : '262'} 212 257" 
          fill="none" stroke="${strokeColor}" stroke-width="${lineWeight}" />
    <path d="M 184 254 Q 187 259 191 258" fill="none" stroke="${strokeColor}" stroke-width="1.1" />
    <path d="M 216 254 Q 213 259 209 258" fill="none" stroke="${strokeColor}" stroke-width="1.1" />

    <!-- Mouth & Lips -->
    <path d="M 172 295 Q 200 293 228 295" fill="none" stroke="${strokeColor}" stroke-width="${lineWeight + 0.3}" />
    <path d="M 182 290 Q 200 286 218 290" fill="none" stroke="${strokeColor}" stroke-width="0.9" opacity="0.5" />
    <path d="M 185 304 Q 200 308 215 304" fill="none" stroke="${strokeColor}" stroke-width="1.1" opacity="0.6" />

    <!-- Chin cleft / accent -->
    <path d="M 195 342 Q 200 345 205 342" fill="none" stroke="${strokeColor}" stroke-width="1.2" opacity="0.5" />

    <!-- Cheek Scar if present -->
    ${hasCheekScar ? `
      <g opacity="0.85">
        <path d="M 145 250 Q 155 268 150 285" fill="none" stroke="${strokeColor}" stroke-width="2.0" stroke-linecap="round" />
        <line x1="144" y1="258" x2="152" y2="256" stroke="${strokeColor}" stroke-width="0.9" />
        <line x1="148" y1="270" x2="156" y2="268" stroke="${strokeColor}" stroke-width="0.9" />
        <line x1="146" y1="280" x2="154" y2="278" stroke="${strokeColor}" stroke-width="0.9" />
      </g>
    ` : ''}

    <!-- Facial Hair (Stubble / Mustache) -->
    ${hasMustache ? `
      <path d="M 175 288 Q 200 280 225 288 Q 200 294 175 288 Z" fill="url(#crossHatch-${seed})" stroke="${strokeColor}" stroke-width="0.8" opacity="0.75" />
    ` : ''}
    ${hasBeard ? `
      <path d="M 140 300 Q 170 365 200 365 Q 230 365 260 300 C 275 350, 235 375, 200 375 C 165 375, 125 350, 140 300 Z" 
            fill="url(#crossHatch-${seed})" stroke="${strokeColor}" stroke-width="0.5" opacity="0.6" />
    ` : ''}

    <!-- Glasses if present -->
    ${hasGlasses ? `
      <g stroke="${strokeColor}" stroke-width="1.8" fill="rgba(255,255,255,0.04)">
        <rect x="142" y="193" width="46" height="25" rx="3" />
        <rect x="212" y="193" width="46" height="25" rx="3" />
        <line x1="188" y1="202" x2="212" y2="202" stroke-width="2" />
        <line x1="142" y1="202" x2="120" y2="197" stroke-width="1.4" />
        <line x1="258" y1="202" x2="280" y2="197" stroke-width="1.4" />
      </g>
    ` : ''}

    <!-- Forensic Landmark Reticle Points (Crosshairs) -->
    <circle cx="165" cy="205" r="1.5" fill="#00f0ff" opacity="0.6" />
    <circle cx="235" cy="205" r="1.5" fill="#00f0ff" opacity="0.6" />
    <circle cx="200" cy="256" r="1.5" fill="#00f0ff" opacity="0.6" />
    <circle cx="200" cy="295" r="1.5" fill="#00f0ff" opacity="0.6" />
    <circle cx="200" cy="${chinY}" r="1.5" fill="#00f0ff" opacity="0.6" />
  </g>

  <!-- Technical Calibration Border Grid -->
  <g opacity="0.25" stroke="#d4af37" stroke-width="0.6">
    <line x1="20" y1="20" x2="50" y2="20" />
    <line x1="20" y1="20" x2="20" y2="50" />
    <line x1="380" y1="20" x2="350" y2="20" />
    <line x1="380" y1="20" x2="380" y2="50" />
    <line x1="20" y1="460" x2="50" y2="460" />
    <line x1="20" y1="460" x2="20" y2="430" />
    <line x1="380" y1="460" x2="350" y2="460" />
    <line x1="380" y1="460" x2="380" y2="430" />
    <!-- Center reference axes -->
    <line x1="200" y1="30" x2="200" y2="40" stroke-dasharray="2,2" />
    <line x1="200" y1="440" x2="200" y2="450" stroke-dasharray="2,2" />
  </g>

  <!-- Official Forensic Stamp Watermark in bottom right -->
  <g transform="translate(230, 435)" opacity="0.5">
    <rect x="0" y="0" width="150" height="22" fill="#0e1118" stroke="#d4af37" stroke-width="0.8" rx="2" />
    <text x="6" y="15" font-family="monospace" font-size="8.5" fill="#d4af37" letter-spacing="1">
      ITER #${iteration} // SEED:${seed.toString().slice(-4)}
    </text>
  </g>
</svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
