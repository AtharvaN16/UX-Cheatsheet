import React from 'react';

/**
 * Direct white icon component without white background card fill.
 * Renders icons directly in crisp WHITE (#FFFFFF) over category header backgrounds.
 */
function FramedBadge({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <svg
      className="w-36 h-36 sm:w-40 sm:h-40"
      viewBox="0 0 256 256"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Centered Vector Artwork in Pure White */}
      <g transform="translate(32, 32) scale(0.75)" fill="#FFFFFF">
        {children}
      </g>
    </svg>
  );
}

/** Variant for clean stroke-only icons in pure white */
function StrokeFramedBadge({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <svg
      className="w-36 h-36 sm:w-40 sm:h-40"
      viewBox="0 0 256 256"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Centered Phosphor Stroke Artwork in Pure White */}
      <g
        transform="translate(32, 32) scale(0.75)"
        stroke="#FFFFFF"
        fill="none"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </g>
    </svg>
  );
}

export const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  // 01 UX Psychology: User Provided SVG Path
  'ux-psychology': (
    <FramedBadge id="ux-psychology">
      <path d="M248,124a56.11,56.11,0,0,0-32-50.61V72a48,48,0,0,0-88-26.49A48,48,0,0,0,40,72v1.39a56,56,0,0,0,0,101.2V176a48,48,0,0,0,88,26.49A48,48,0,0,0,216,176v-1.41A56.09,56.09,0,0,0,248,124ZM88,208a32,32,0,0,1-31.81-28.56A55.87,55.87,0,0,0,64,180h8a8,8,0,0,0,0-16H64A40,40,0,0,1,50.67,86.27,8,8,0,0,0,56,78.73V72a32,32,0,1,1,64,0v68.26A47.8,47.8,0,0,0,88,128a8,8,0,0,0,0,16,32,32,0,0,1,0,64Zm104-44h-8a8,8,0,0,0,0,16h8a55.87,55.87,0,0,0,7.81-.56A32,32,0,1,1,168,144a8,8,0,0,0,0-16,47.8,47.8,0,0,0-32,12.26V72a32,32,0,0,1,64,0v6.73a8,8,0,0,0,5.33,7.54A40,40,0,0,1,192,164Zm16-52a8,8,0,0,1-8,8h-4a36,36,0,0,1-36-36V80a8,8,0,0,1,16,0v4a20,20,0,0,0,20,20h4A8,8,0,0,1,208,112ZM60,120H56a8,8,0,0,1,0-16h4A20,20,0,0,0,80,84V80a8,8,0,0,1,16,0v4A36,36,0,0,1,60,120Z" />
    </FramedBadge>
  ),

  // 02 Strategic Thinking: Agent Council Compass Stroke
  'strategic-thinking': (
    <StrokeFramedBadge id="strategic-thinking">
      <circle cx="128" cy="128" r="88" />
      <polygon points="168,88 144,144 88,168 112,112" />
      <circle cx="128" cy="128" r="6" />
    </StrokeFramedBadge>
  ),

  // 03 Research & Synthesis: User Provided SVG Path
  'research-synthesis': (
    <FramedBadge id="research-synthesis">
      <path d="M221.69,199.77,160,96.92V40h8a8,8,0,0,0,0-16H88a8,8,0,0,0,0,16h8V96.92L34.31,199.77A16,16,0,0,0,48,224H208a16,16,0,0,0,23.72-24.23ZM110.86,103.25A7.93,7.93,0,0,0,112,99.14V40h32V99.14a7.93,7.93,0,0,0,1.14,4.11L183.36,167c-12,2.37-29.07,1.37-51.75-10.11-15.91-8.05-31.05-12.32-45.22-12.81ZM48,208l28.54-47.58c14.25-1.74,30.31,1.85,47.82,10.72,19,9.61,35,12.88,48,12.88a69.89,69.89,0,0,0,19.55-2.7L208,208Z" />
    </FramedBadge>
  ),

  // 04 Qualitative Research: Agent Council ChatTeardropText Stroke
  'qualitative-research': (
    <StrokeFramedBadge id="qualitative-research">
      <path d="M128 48 C172 48 208 84 208 128 C208 172 172 208 128 208 C104 208 80 198 64 184 L32 196 L44 164 C34 150 28 134 28 116 C28 78 68 48 128 48 Z" />
      <line x1="88" y1="112" x2="168" y2="112" />
      <line x1="88" y1="144" x2="144" y2="144" />
    </StrokeFramedBadge>
  ),

  // 05 Quantitative Research: Agent Council ChartBar Stroke
  'quantitative-research': (
    <StrokeFramedBadge id="quantitative-research">
      <line x1="40" y1="208" x2="216" y2="208" />
      <rect x="48" y="144" width="36" height="64" rx="4" />
      <rect x="104" y="96" width="36" height="112" rx="4" />
      <rect x="160" y="48" width="36" height="160" rx="4" />
    </StrokeFramedBadge>
  ),

  // 06 Ideation: Agent Council Lightbulb Stroke
  'ideation': (
    <StrokeFramedBadge id="ideation">
      <path d="M128 32 C80 32 48 72 48 112 C48 140 68 164 80 184 H176 C188 164 208 140 208 112 C208 72 176 32 128 32 Z" />
      <line x1="88" y1="216" x2="168" y2="216" />
      <line x1="96" y1="184" x2="160" y2="184" />
    </StrokeFramedBadge>
  ),

  // 07 IA & Structure: Agent Council TreeStructure Stroke
  'ia-structure': (
    <StrokeFramedBadge id="ia-structure">
      <rect x="88" y="32" width="80" height="48" rx="8" />
      <rect x="32" y="160" width="56" height="48" rx="8" />
      <rect x="168" y="160" width="56" height="48" rx="8" />
      <line x1="128" y1="80" x2="128" y2="120" />
      <line x1="60" y1="120" x2="196" y2="120" />
      <line x1="60" y1="120" x2="60" y2="160" />
      <line x1="196" y1="120" x2="196" y2="160" />
    </StrokeFramedBadge>
  ),

  // 08 Interaction Design: Agent Council CursorClick Stroke
  'interaction-design': (
    <StrokeFramedBadge id="interaction-design">
      <polygon points="100,100 160,200 176,152 224,144" />
      <circle cx="100" cy="100" r="32" strokeDasharray="6 6" />
    </StrokeFramedBadge>
  ),

  // 09 Content Design: Agent Council Article Stroke
  'content-design': (
    <StrokeFramedBadge id="content-design">
      <rect x="40" y="40" width="176" height="176" rx="16" />
      <line x1="72" y1="80" x2="184" y2="80" />
      <line x1="72" y1="120" x2="184" y2="120" />
      <line x1="72" y1="160" x2="144" y2="160" />
    </StrokeFramedBadge>
  ),

  // 10 Visual Design: Agent Council Palette Stroke
  'visual-design': (
    <StrokeFramedBadge id="visual-design">
      <path d="M128 32 C75 32 32 75 32 128 C32 181 75 224 128 224 C148 224 160 208 160 192 C160 176 172 168 184 168 H192 C210 168 224 150 224 128 C224 75 181 32 128 32 Z" />
      <circle cx="80" cy="96" r="12" />
      <circle cx="128" cy="80" r="12" />
      <circle cx="176" cy="96" r="12" />
    </StrokeFramedBadge>
  ),

  // 11 Prototyping: Agent Council DeviceMobile Stroke
  'prototyping': (
    <StrokeFramedBadge id="prototyping">
      <rect x="56" y="32" width="144" height="192" rx="20" />
      <line x1="96" y1="60" x2="160" y2="60" />
      <circle cx="128" cy="192" r="10" />
    </StrokeFramedBadge>
  ),

  // 12 Evaluation: Agent Council CheckCircle Stroke
  'evaluation': (
    <StrokeFramedBadge id="evaluation">
      <circle cx="128" cy="128" r="88" />
      <polyline points="84,128 116,160 172,96" />
    </StrokeFramedBadge>
  ),

  // 13 Accessibility: User Provided SVG Path
  'accessibility': (
    <FramedBadge id="accessibility">
      <path d="M160,40a32,32,0,1,0-32,32A32,32,0,0,0,160,40ZM128,56a16,16,0,1,1,16-16A16,16,0,0,1,128,56ZM231.5,87.71A19.62,19.62,0,0,0,212,72H44a20,20,0,0,0-8.38,38.16l.13,0,50.75,22.35-21,79.72A20,20,0,0,0,102,228.8l26-44.87,26,44.87a20,20,0,0,0,36.4-16.52l-21-79.72,50.75-22.35.13,0A19.64,19.64,0,0,0,231.5,87.71Zm-17.8,7.9-56.93,25.06a8,8,0,0,0-4.51,9.36L175.13,217a7,7,0,0,0,.49,1.35,4,4,0,0,1-5,5.45,4,4,0,0,1-2.25-2.07,6.31,6.31,0,0,0-.34-.63L134.92,164a8,8,0,0,0-13.84,0L88,221.05a6.31,6.31,0,0,0-.34.63,4,4,0,0,1-2.25,2.07,4,4,0,0,1-5-5.45,7,7,0,0,0,.49-1.35L103.74,130a8,8,0,0,0-4.51-9.36L42.3,95.61A4,4,0,0,1,44,88H212a4,4,0,0,1,1.73,7.61Z" />
    </FramedBadge>
  ),

  // 14 Service Design: Agent Council FlowArrow Stroke
  'service-design': (
    <StrokeFramedBadge id="service-design">
      <path d="M48 192 C48 140 104 140 104 80 C104 50 144 50 176 80 L208 112" />
      <polyline points="184,112 208,112 208,88" />
      <circle cx="48" cy="192" r="12" />
    </StrokeFramedBadge>
  ),

  // 15 AI Design: Agent Council Sparkle Stroke
  'ai-design': (
    <StrokeFramedBadge id="ai-design">
      <path d="M128 32 L144 96 L208 112 L144 128 L128 192 L112 128 L48 112 L112 96 Z" />
      <path d="M192 160 L200 184 L224 192 L200 200 L192 224 L184 200 L160 192 L184 184 Z" />
    </StrokeFramedBadge>
  ),

  // 16 Metrics & Experimentation: Agent Council ChartLineUp Stroke
  'metrics-experimentation': (
    <StrokeFramedBadge id="metrics-experimentation">
      <polyline points="40,208 40,40" />
      <polyline points="40,208 216,208" />
      <polyline points="40,168 96,128 144,152 208,72" />
      <polyline points="168,72 208,72 208,112" />
    </StrokeFramedBadge>
  ),

  // 17 Design Systems: Agent Council SquaresFour Stroke
  'design-systems': (
    <StrokeFramedBadge id="design-systems">
      <rect x="40" y="40" width="72" height="72" rx="12" />
      <rect x="144" y="40" width="72" height="72" rx="12" />
      <rect x="40" y="144" width="72" height="72" rx="12" />
      <rect x="144" y="144" width="72" height="72" rx="12" />
    </StrokeFramedBadge>
  ),

  // 18 Facilitation: Agent Council PresentationChart Stroke
  'facilitation': (
    <StrokeFramedBadge id="facilitation">
      <rect x="32" y="40" width="192" height="128" rx="12" />
      <line x1="128" y1="168" x2="128" y2="224" />
      <line x1="88" y1="224" x2="168" y2="224" />
      <polyline points="72,128 104,96 144,120 184,80" />
    </StrokeFramedBadge>
  ),

  // 19 Communication: User Provided SVG Path
  'communication': (
    <FramedBadge id="communication">
      <path d="M248,120a48.05,48.05,0,0,0-48-48H160.2c-2.91-.17-53.62-3.74-101.91-44.24A16,16,0,0,0,32,40V200a16,16,0,0,0,26.29,12.25c37.77-31.68,77-40.76,93.71-43.3v31.72A16,16,0,0,0,159.12,214l11,7.33A16,16,0,0,0,194.5,212l11.77-44.36A48.07,48.07,0,0,0,248,120ZM48,199.93V40h0c42.81,35.91,86.63,45,104,47.24v65.48C134.65,155,90.84,164.07,48,199.93Zm131,8,0,.11-11-7.33V168h21.6ZM200,152H168V88h32a32,32,0,1,1,0,64Z" />
    </FramedBadge>
  ),

  // 20 Career & Practice: Agent Council Briefcase Stroke
  'career-practice': (
    <StrokeFramedBadge id="career-practice">
      <rect x="32" y="72" width="192" height="136" rx="16" />
      <path d="M88 72 V48 C88 36 100 28 128 28 C156 28 168 36 168 48 V72" />
      <line x1="32" y1="120" x2="224" y2="120" />
    </StrokeFramedBadge>
  ),
};

export function getCategoryIcon(id: string): React.ReactNode {
  return (
    CATEGORY_ICONS[id] || (
      <StrokeFramedBadge id="default">
        <rect x="40" y="40" width="176" height="176" rx="16" />
      </StrokeFramedBadge>
    )
  );
}
