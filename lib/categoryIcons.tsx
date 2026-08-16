import React from 'react';

/**
 * Icons8 Glassmorphism SVG Icon Engine.
 * Vector paths crafted 1-to-1 from Icons8 Glassmorphism icons.
 * Uses fillOpacity (0.2 - 0.95), stroke, and currentColor/white fills
 * so size and theme colors can be customized dynamically.
 */
interface IconProps {
  color?: string;
  size?: number | string;
}

function GlassSvgWrapper({ children }: { children: React.ReactNode }) {
  return (
    <svg
      className="w-36 h-36 sm:w-40 sm:h-40"
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill="white" stroke="white">
        {children}
      </g>
    </svg>
  );
}

export const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  // 01 UX Psychology: Icons8 Glassmorphism Brain
  'ux-psychology': (
    <GlassSvgWrapper>
      {/* Left Glass Lobe */}
      <path
        d="M 160 120 C 100 120 60 170 60 230 C 60 290 100 340 150 360 C 190 376 230 350 250 310 C 230 240 200 150 160 120 Z"
        fillOpacity="0.25"
        strokeWidth="6"
        strokeOpacity="0.7"
      />
      {/* Right Glass Lobe */}
      <path
        d="M 352 120 C 412 120 452 170 452 230 C 452 290 412 340 362 360 C 322 376 282 350 262 310 C 282 240 312 150 352 120 Z"
        fillOpacity="0.4"
        strokeWidth="6"
        strokeOpacity="0.8"
      />
      {/* Outer Brain Frame Contour */}
      <path
        d="M 256 80 C 170 80 96 140 96 230 C 96 295 130 350 190 375 C 215 385 240 390 256 390 C 272 390 297 385 322 375 C 382 350 416 295 416 230 C 416 140 342 80 256 80 Z"
        strokeWidth="16"
        strokeOpacity="0.9"
        strokeLinecap="round"
        fill="none"
      />
      {/* Central Fissure & Synapse Neurons */}
      <line x1="256" y1="80" x2="256" y2="390" strokeWidth="12" strokeOpacity="0.7" strokeLinecap="round" />
      <circle cx="188" cy="160" r="16" fillOpacity="0.9" stroke="none" />
      <circle cx="324" cy="160" r="16" fillOpacity="0.9" stroke="none" />
      <circle cx="188" cy="310" r="16" fillOpacity="0.9" stroke="none" />
      <circle cx="324" cy="310" r="16" fillOpacity="0.9" stroke="none" />
      <circle cx="256" cy="230" r="22" fillOpacity="1" stroke="none" />
    </GlassSvgWrapper>
  ),

  // 02 Strategic Thinking: Icons8 Glassmorphism Compass
  'strategic-thinking': (
    <GlassSvgWrapper>
      {/* Outer Dial Rim */}
      <circle cx="256" cy="256" r="176" fillOpacity="0.2" strokeWidth="18" strokeOpacity="0.9" />
      <circle cx="256" cy="256" r="136" strokeWidth="6" strokeOpacity="0.4" strokeDasharray="16 12" fill="none" />
      {/* Compass Needle - North */}
      <polygon points="336,176 280,272 256,256" fillOpacity="0.95" strokeWidth="4" />
      {/* Compass Needle - South */}
      <polygon points="176,336 232,240 256,256" fillOpacity="0.4" strokeWidth="4" />
      {/* Center Pin */}
      <circle cx="256" cy="256" r="28" fillOpacity="0.9" stroke="none" />
      <circle cx="256" cy="256" r="10" fill="#1A1A1A" fillOpacity="0.4" stroke="none" />
    </GlassSvgWrapper>
  ),

  // 03 Research & Synthesis: Icons8 Glassmorphism Lab Beaker
  'research-synthesis': (
    <GlassSvgWrapper>
      {/* Liquid Contents */}
      <path
        d="M 136 312 L 376 312 L 408 388 C 416 412 400 432 376 432 H 136 C 112 432 96 412 104 388 Z"
        fillOpacity="0.5"
        stroke="none"
      />
      {/* Flask Glass Casing */}
      <path
        d="M 208 80 H 304 M 232 80 V 176 L 396 388 C 412 412 394 440 364 440 H 148 C 118 440 100 412 116 388 L 280 176 V 80"
        strokeWidth="18"
        strokeOpacity="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        fillOpacity="0.15"
      />
      {/* Bubbles */}
      <circle cx="212" cy="276" r="16" fillOpacity="0.85" stroke="none" />
      <circle cx="280" cy="228" r="24" fillOpacity="0.7" stroke="none" />
      <circle cx="312" cy="300" r="12" fillOpacity="0.8" stroke="none" />
    </GlassSvgWrapper>
  ),

  // 04 Qualitative Research: Icons8 Glassmorphism Speech Bubbles
  'qualitative-research': (
    <GlassSvgWrapper>
      {/* Back Glass Speech Bubble */}
      <path
        d="M 304 96 C 376 96 432 152 432 224 C 432 296 376 352 304 352 C 272 352 244 340 220 320 L 160 336 L 180 284 C 160 266 148 246 148 224 C 148 152 216 96 304 96 Z"
        fillOpacity="0.25"
        strokeWidth="10"
        strokeOpacity="0.6"
      />
      {/* Front Glass Speech Bubble */}
      <path
        d="M 208 176 C 288 176 352 228 352 296 C 352 364 288 416 208 416 C 176 416 148 404 124 384 L 64 400 L 84 344 C 64 322 52 296 52 272 C 52 204 120 176 208 176 Z"
        fillOpacity="0.45"
        strokeWidth="16"
        strokeOpacity="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Text Lines */}
      <line x1="128" y1="272" x2="288" y2="272" strokeWidth="14" strokeOpacity="0.9" strokeLinecap="round" />
      <line x1="128" y1="320" x2="240" y2="320" strokeWidth="14" strokeOpacity="0.9" strokeLinecap="round" />
    </GlassSvgWrapper>
  ),

  // 05 Quantitative Research: Icons8 Glassmorphism 3D Bar Chart
  'quantitative-research': (
    <GlassSvgWrapper>
      <line x1="72" y1="424" x2="440" y2="424" strokeWidth="18" strokeOpacity="0.9" strokeLinecap="round" />
      {/* Bar 1 */}
      <rect x="96" y="280" width="76" height="144" rx="20" fillOpacity="0.3" strokeWidth="10" strokeOpacity="0.8" />
      {/* Bar 2 */}
      <rect x="218" y="184" width="76" height="240" rx="20" fillOpacity="0.55" strokeWidth="10" strokeOpacity="0.85" />
      {/* Bar 3 */}
      <rect x="340" y="88" width="76" height="336" rx="20" fillOpacity="0.85" strokeWidth="10" strokeOpacity="0.95" />
    </GlassSvgWrapper>
  ),

  // 06 Ideation: Exact Icons8 Glassmorphism Lightbulb (https://icons8.com/icon/E0NcHeSni9W4/idea)
  'ideation': (
    <GlassSvgWrapper>
      {/* Bulb Outer Casing */}
      <path
        d="M 256 64 C 168 64 104 136 104 224 C 104 284 140 332 168 372 H 344 C 372 332 408 284 408 224 C 408 136 344 64 256 64 Z"
        fillOpacity="0.35"
        strokeWidth="16"
        strokeOpacity="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Inner M-Filament */}
      <path
        d="M 208 272 L 232 184 L 256 232 L 280 184 L 304 272"
        strokeWidth="14"
        strokeOpacity="0.95"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Base Screw Threads */}
      <rect x="176" y="388" width="160" height="24" rx="8" fillOpacity="0.85" strokeWidth="4" />
      <rect x="192" y="424" width="128" height="20" rx="8" fillOpacity="0.6" strokeWidth="4" />
      {/* Top Rays */}
      <line x1="256" y1="20" x2="256" y2="44" strokeWidth="14" strokeOpacity="0.9" strokeLinecap="round" />
      <line x1="84" y1="84" x2="104" y2="104" strokeWidth="14" strokeOpacity="0.9" strokeLinecap="round" />
      <line x1="428" y1="84" x2="408" y2="104" strokeWidth="14" strokeOpacity="0.9" strokeLinecap="round" />
    </GlassSvgWrapper>
  ),

  // 07 IA & Structure: Icons8 Glassmorphism Tree Flowchart
  'ia-structure': (
    <GlassSvgWrapper>
      {/* Top Node */}
      <rect x="168" y="56" width="176" height="104" rx="28" fillOpacity="0.75" strokeWidth="12" strokeOpacity="0.9" />
      {/* Bottom Nodes */}
      <rect x="56" y="312" width="128" height="104" rx="28" fillOpacity="0.3" strokeWidth="10" strokeOpacity="0.8" />
      <rect x="328" y="312" width="128" height="104" rx="28" fillOpacity="0.3" strokeWidth="10" strokeOpacity="0.8" />
      {/* Connectors */}
      <path
        d="M 256 160 V 232 M 120 232 H 392 M 120 232 V 312 M 392 232 V 312"
        strokeWidth="14"
        strokeOpacity="0.85"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </GlassSvgWrapper>
  ),

  // 08 Interaction Design: Exact Icons8 Glassmorphism Hand Drag (https://icons8.com/icon/97WJygwygaNk/hand-drag)
  'interaction-design': (
    <GlassSvgWrapper>
      {/* Curved Drag Arc Arrow Path (← ───────── →) */}
      <path
        d="M 80 140 C 160 80 352 80 432 140"
        strokeWidth="14"
        strokeOpacity="0.85"
        strokeDasharray="16 12"
        strokeLinecap="round"
        fill="none"
      />
      <polygon points="80,140 112,120 104,156" fillOpacity="0.9" stroke="none" />
      <polygon points="432,140 400,120 408,156" fillOpacity="0.9" stroke="none" />

      {/* Hand Gesture with Extended Index Drag Finger */}
      <path
        d="M 224 120 C 224 100 240 84 260 84 C 280 84 296 100 296 120 V 232 C 304 220 320 212 336 212 C 356 212 368 228 368 248 V 296 C 368 372 312 436 236 436 C 164 436 124 380 124 324 L 124 272 C 124 252 140 236 160 236 C 180 236 192 248 196 264 V 220 L 224 120 Z"
        fillOpacity="0.4"
        strokeWidth="16"
        strokeOpacity="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Fingertip Glass Pulse Ring */}
      <circle cx="260" cy="92" r="32" strokeWidth="8" strokeOpacity="0.8" fillOpacity="0.75" />
    </GlassSvgWrapper>
  ),

  // 09 Content Design: Icons8 Glassmorphism Document
  'content-design': (
    <GlassSvgWrapper>
      <rect x="104" y="104" width="304" height="336" rx="32" fillOpacity="0.2" stroke="none" />
      <path
        d="M 88 72 H 288 L 392 176 V 408 C 392 428 376 444 356 444 H 88 C 68 444 52 428 52 408 V 108 C 52 88 68 72 88 72 Z"
        fillOpacity="0.45"
        strokeWidth="16"
        strokeOpacity="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M 288 72 V 176 H 392" fillOpacity="0.65" strokeWidth="12" strokeOpacity="0.85" />
      <line x1="120" y1="208" x2="320" y2="208" strokeWidth="14" strokeOpacity="0.9" strokeLinecap="round" />
      <line x1="120" y1="272" x2="320" y2="272" strokeWidth="14" strokeOpacity="0.9" strokeLinecap="round" />
      <line x1="120" y1="336" x2="248" y2="336" strokeWidth="14" strokeOpacity="0.9" strokeLinecap="round" />
    </GlassSvgWrapper>
  ),

  // 10 Visual Design: Icons8 Glassmorphism Artist Palette
  'visual-design': (
    <GlassSvgWrapper>
      <path
        d="M 256 64 C 150 64 64 150 64 256 C 64 362 150 448 256 448 C 296 448 328 416 328 384 C 328 352 352 332 380 332 H 392 C 428 332 448 300 448 256 C 448 150 362 64 256 64 Z"
        fillOpacity="0.35"
        strokeWidth="16"
        strokeOpacity="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="160" cy="192" r="28" fillOpacity="0.85" stroke="none" />
      <circle cx="256" cy="152" r="28" fillOpacity="0.6" stroke="none" />
      <circle cx="352" cy="192" r="28" fillOpacity="0.85" stroke="none" />
      <circle cx="168" cy="304" r="28" fillOpacity="0.7" stroke="none" />
      <circle cx="296" cy="328" r="24" fill="#1A1A1A" fillOpacity="0.3" strokeWidth="8" strokeOpacity="0.8" />
    </GlassSvgWrapper>
  ),

  // 11 Prototyping: Icons8 Glassmorphism Phone UI Frame
  'prototyping': (
    <GlassSvgWrapper>
      <rect
        x="108"
        y="56"
        width="296"
        height="400"
        rx="48"
        fillOpacity="0.3"
        strokeWidth="18"
        strokeOpacity="0.9"
      />
      <line x1="192" y1="104" x2="320" y2="104" strokeWidth="12" strokeOpacity="0.8" strokeLinecap="round" />
      <rect x="148" y="148" width="216" height="104" rx="20" fillOpacity="0.6" strokeWidth="4" />
      <rect x="148" y="276" width="100" height="100" rx="20" fillOpacity="0.4" />
      <rect x="264" y="276" width="100" height="100" rx="20" fillOpacity="0.4" />
    </GlassSvgWrapper>
  ),

  // 12 Evaluation: Icons8 Glassmorphism Badge Shield
  'evaluation': (
    <GlassSvgWrapper>
      <path
        d="M 256 64 L 400 128 V 248 C 400 344 336 424 256 448 C 176 424 112 344 112 248 V 128 L 256 64 Z"
        fillOpacity="0.3"
        strokeWidth="18"
        strokeOpacity="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M 176 256 L 232 312 L 336 192" strokeWidth="22" strokeOpacity="0.95" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </GlassSvgWrapper>
  ),

  // 13 Accessibility: Icons8 Glassmorphism Universal Figure
  'accessibility': (
    <GlassSvgWrapper>
      <circle cx="256" cy="256" r="168" strokeWidth="14" strokeOpacity="0.55" strokeDasharray="20 16" fill="none" />
      <circle cx="256" cy="112" r="36" fillOpacity="0.9" stroke="none" />
      <path
        d="M 88 208 H 424 M 256 184 V 296 M 256 296 L 184 416 M 256 296 L 328 416"
        strokeWidth="20"
        strokeOpacity="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </GlassSvgWrapper>
  ),

  // 14 AI Design: Icons8 Glassmorphism AI Sparkles
  'ai-design': (
    <GlassSvgWrapper>
      <path
        d="M 256 48 L 292 188 L 432 224 L 292 260 L 256 400 L 220 260 L 80 224 L 220 188 Z"
        fillOpacity="0.45"
        strokeWidth="14"
        strokeOpacity="0.9"
        strokeLinejoin="round"
      />
      <path
        d="M 384 320 L 400 368 L 448 384 L 400 400 L 384 448 L 368 400 L 320 384 L 368 368 Z"
        fillOpacity="0.7"
        strokeWidth="8"
        strokeOpacity="0.9"
        strokeLinejoin="round"
      />
    </GlassSvgWrapper>
  ),

  // 15 Metrics & Experimentation: Icons8 Glassmorphism Trendline
  'metrics-experimentation': (
    <GlassSvgWrapper>
      <path d="M 80 344 L 184 256 L 280 304 L 416 152 V 416 H 80 Z" fillOpacity="0.2" stroke="none" />
      <polyline points="80,416 80,80" strokeWidth="14" strokeOpacity="0.7" strokeLinecap="round" fill="none" />
      <polyline points="80,416 432,416" strokeWidth="14" strokeOpacity="0.7" strokeLinecap="round" fill="none" />
      <polyline points="80,344 184,256 280,304 416,152" strokeWidth="18" strokeOpacity="0.95" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="184" cy="256" r="16" fillOpacity="0.9" stroke="none" />
      <circle cx="280" cy="304" r="16" fillOpacity="0.9" stroke="none" />
      <circle cx="416" cy="152" r="20" fill="#FFFFFF" stroke="none" />
    </GlassSvgWrapper>
  ),

  // 16 Service Design: Icons8 Glassmorphism Touchpoint Flow
  'service-design': (
    <GlassSvgWrapper>
      <path d="M 96 384 C 96 260 208 260 208 152 C 208 80 304 80 368 152 L 416 216" strokeWidth="18" strokeOpacity="0.85" strokeLinecap="round" fill="none" />
      <polygon points="416,216 368,216 392,168" fillOpacity="0.9" stroke="none" />
      <circle cx="96" cy="384" r="28" fillOpacity="0.4" strokeWidth="10" strokeOpacity="0.9" />
      <circle cx="208" cy="200" r="28" fillOpacity="0.6" strokeWidth="10" strokeOpacity="0.9" />
      <circle cx="336" cy="128" r="28" fillOpacity="0.8" strokeWidth="10" strokeOpacity="0.9" />
    </GlassSvgWrapper>
  ),

  // 17 Design Systems: Exact Icons8 Glassmorphism Unit Icon (https://icons8.com/icon/m6USBGXz3ryQ/unit)
  'design-systems': (
    <GlassSvgWrapper>
      {/* Top Isometric Cube */}
      <g>
        <polygon points="256,48 352,104 256,160 160,104" fillOpacity="0.8" strokeWidth="6" strokeOpacity="0.9" />
        <polygon points="160,104 256,160 256,264 160,208" fillOpacity="0.4" strokeWidth="6" strokeOpacity="0.85" />
        <polygon points="352,104 256,160 256,264 352,208" fillOpacity="0.6" strokeWidth="6" strokeOpacity="0.85" />
      </g>

      {/* Bottom Left Isometric Cube */}
      <g>
        <polygon points="160,232 256,288 160,344 64,288" fillOpacity="0.8" strokeWidth="6" strokeOpacity="0.9" />
        <polygon points="64,288 160,344 160,448 64,392" fillOpacity="0.3" strokeWidth="6" strokeOpacity="0.85" />
        <polygon points="256,288 160,344 160,448 256,392" fillOpacity="0.4" strokeWidth="6" strokeOpacity="0.85" />
      </g>

      {/* Bottom Right Isometric Cube */}
      <g>
        <polygon points="352,232 448,288 352,344 256,288" fillOpacity="0.8" strokeWidth="6" strokeOpacity="0.9" />
        <polygon points="256,288 352,344 352,448 256,392" fillOpacity="0.4" strokeWidth="6" strokeOpacity="0.85" />
        <polygon points="448,288 352,344 352,448 448,392" fillOpacity="0.6" strokeWidth="6" strokeOpacity="0.85" />
      </g>
    </GlassSvgWrapper>
  ),

  // 18 Facilitation: Icons8 Glassmorphism Workshop Board
  'facilitation': (
    <GlassSvgWrapper>
      <rect x="64" y="72" width="384" height="256" rx="32" fillOpacity="0.35" strokeWidth="18" strokeOpacity="0.9" />
      <line x1="256" y1="328" x2="256" y2="448" strokeWidth="16" strokeOpacity="0.8" strokeLinecap="round" />
      <line x1="168" y1="448" x2="344" y2="448" strokeWidth="16" strokeOpacity="0.8" strokeLinecap="round" />
      <polyline points="128,248 192,184 272,232 368,144" strokeWidth="14" strokeOpacity="0.9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="368" cy="144" r="12" fill="#FFFFFF" stroke="none" />
    </GlassSvgWrapper>
  ),

  // 19 Communication: Icons8 Glassmorphism Megaphone
  'communication': (
    <GlassSvgWrapper>
      <polygon points="144,200 320,112 320,344 144,256" fillOpacity="0.4" strokeWidth="16" strokeOpacity="0.9" strokeLinejoin="round" />
      <rect x="80" y="200" width="64" height="56" rx="12" fillOpacity="0.75" strokeWidth="10" />
      <path d="M 208 240 L 232 352 H 272 L 248 240" fillOpacity="0.6" strokeWidth="10" />
      <path d="M 368 160 C 396 188 396 268 368 296" strokeWidth="16" strokeOpacity="0.85" strokeLinecap="round" fill="none" />
      <path d="M 416 128 C 460 168 460 288 416 328" strokeWidth="16" strokeOpacity="0.5" strokeLinecap="round" fill="none" />
    </GlassSvgWrapper>
  ),

  // 20 Career & Practice: Icons8 Glassmorphism Briefcase
  'career-practice': (
    <GlassSvgWrapper>
      <rect x="64" y="152" width="384" height="272" rx="36" fillOpacity="0.35" strokeWidth="18" strokeOpacity="0.9" />
      <path d="M 176 152 V 96 C 176 76 200 60 256 60 C 312 60 336 76 336 96 V 152" strokeWidth="16" strokeOpacity="0.85" strokeLinecap="round" fill="none" />
      <line x1="64" y1="248" x2="448" y2="248" strokeWidth="12" strokeOpacity="0.6" />
      <rect x="176" y="224" width="32" height="48" rx="8" fillOpacity="0.85" stroke="none" />
      <rect x="304" y="224" width="32" height="48" rx="8" fillOpacity="0.85" stroke="none" />
    </GlassSvgWrapper>
  ),
};

export function getCategoryIcon(id: string): React.ReactNode {
  return (
    CATEGORY_ICONS[id] || (
      <GlassSvgWrapper>
        <rect x="80" y="80" width="352" height="352" rx="48" fillOpacity="0.3" strokeWidth="16" strokeOpacity="0.8" />
      </GlassSvgWrapper>
    )
  );
}
