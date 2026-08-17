export interface Domain {
  id: string;
  number: string;
  title: string;
}

export interface DomainGroup {
  title: string;
  domainIds: string[];
  fillClass: string;
}

export const DOMAINS: readonly Domain[] = [
  { id: 'ux-psychology', number: '01', title: 'UX Psychology' },
  { id: 'strategic-thinking', number: '02', title: 'Strategic Thinking' },
  { id: 'research-synthesis', number: '03', title: 'Research & Synthesis' },
  { id: 'qualitative-research', number: '04', title: 'Qualitative Research' },
  { id: 'quantitative-research', number: '05', title: 'Quantitative Research' },
  { id: 'ideation', number: '06', title: 'Ideation' },
  { id: 'ia-structure', number: '07', title: 'IA & Structure' },
  { id: 'interaction-design', number: '08', title: 'Interaction Design' },
  { id: 'content-design', number: '09', title: 'Content Design' },
  { id: 'visual-design', number: '10', title: 'Visual Design' },
  { id: 'prototyping', number: '11', title: 'Prototyping' },
  { id: 'evaluation', number: '12', title: 'Evaluation' },
  { id: 'accessibility', number: '13', title: 'Accessibility' },
  { id: 'ai-design', number: '14', title: 'AI Design' },
  { id: 'metrics-experimentation', number: '15', title: 'Metrics & Experimentation' },
  { id: 'service-design', number: '16', title: 'Service Design' },
  { id: 'design-systems', number: '17', title: 'Design Systems' },
  { id: 'facilitation', number: '18', title: 'Facilitation' },
  { id: 'communication', number: '19', title: 'Communication' },
  { id: 'career-practice', number: '20', title: 'Career & Practice' },
] as const;

export const DOMAIN_GROUPS: readonly DomainGroup[] = [
  {
    title: 'UX Psychology',
    domainIds: ['ux-psychology'],
    fillClass: 'bg-[#B24A58] text-white border-none',
  },
  {
    title: 'Strategic Thinking',
    domainIds: ['strategic-thinking'],
    fillClass: 'bg-[#2E8A75] text-white border-none',
  },
  {
    title: 'Research',
    domainIds: ['research-synthesis', 'qualitative-research', 'quantitative-research'],
    fillClass: 'bg-[#3B72B2] text-white border-none',
  },
  {
    title: 'Design & Craft',
    domainIds: [
      'ideation',
      'ia-structure',
      'interaction-design',
      'content-design',
      'visual-design',
      'prototyping',
    ],
    fillClass: 'bg-[#6B46C1] text-white border-none',
  },
  {
    title: 'Evaluation & Optimization',
    domainIds: [
      'evaluation',
      'accessibility',
      'ai-design',
      'metrics-experimentation',
    ],
    fillClass: 'bg-[#C85A32] text-white border-none',
  },
  {
    title: 'Systems & Professional Practice',
    domainIds: [
      'service-design',
      'design-systems',
      'facilitation',
      'communication',
      'career-practice',
    ],
    fillClass: 'bg-[#C77D1E] text-white border-none',
  },
] as const;

export const DOMAIN_DESCRIPTIONS: Record<string, string> = {
  'ux-psychology': 'Principles of human cognition, perception, decision biases, and behavioral psychology.',
  'strategic-thinking': 'Frameworks for product strategy, systems thinking, decision making, and prioritization.',
  'research-synthesis': 'Framing research problems, organizing operations, and synthesizing qualitative insights.',
  'qualitative-research': 'User interviewing, contextual inquiries, field observation, and participatory design.',
  'quantitative-research': 'Product analytics, quantitative usability metrics, surveys, scales, and data.',
  'ideation': 'Divergent thinking, collaborative brainstorming, and systematic innovation methods.',
  'ia-structure': 'Information architecture, site mapping, task flows, and navigation hierarchy.',
  'interaction-design': 'Wireframing, UI interaction patterns, microinteractions, state management, and onboarding.',
  'content-design': 'UX writing, microcopy, voice & tone, plain language, and content modeling.',
  'visual-design': 'Visual hierarchy, typography, color theory, grid systems, and design tokens.',
  'prototyping': 'Paper, low, mid, and high-fidelity prototyping, plus validation experiments.',
  'evaluation': 'Usability testing, heuristic evaluations, expert reviews, and comparative testing.',
  'accessibility': 'Inclusive design, WCAG compliance, screen readers, ARIA, and universal design.',
  'ai-design': 'Prompt design, human-in-the-loop interactions, trust calibration, and AI mental models.',
  'metrics-experimentation': 'KPI trees, A/B testing, statistical significance, and guardrail metrics.',
  'service-design': 'Service blueprints, ecosystem mapping, touchpoint analysis, and backstage processes.',
  'design-systems': 'Token architecture, component API design, governance, and system documentation.',
  'facilitation': 'Workshop design, sprint planning, design critiques, and retrospectives.',
  'communication': 'UX reports, executive summaries, research readouts, and design rationale.',
  'career-practice': 'Portfolio storytelling, case studies, cross-functional collaboration, and design QA.',
};

export function getDomainDescription(domainId: string): string {
  if (!domainId) return 'Essential UX methods, models, and frameworks.';
  const normId = domainId.toLowerCase().trim();
  return DOMAIN_DESCRIPTIONS[normId] || 'Essential UX methods, models, and frameworks.';
}

export const GROUP_DESCRIPTIONS: Record<string, string> = {
  'UX Psychology': 'Human cognition, perception, decision-making biases, and behavioral psychology principles.',
  'Strategic Thinking': 'Product strategy, systems thinking, decision-making frameworks, and prioritization.',
  'Research': 'Framing research problems, qualitative user interviews, observations, and quantitative analytics.',
  'Design & Craft': 'Ideation, information architecture, interaction design, UX writing, visual design, and prototyping.',
  'Evaluation & Optimization': 'Usability testing, heuristic reviews, accessibility audits, AI patterns, and metrics.',
  'Systems & Professional Practice': 'Service blueprints, design token architecture, workshop facilitation, and career growth.',
};

export const GROUP_COLORS: Record<string, string> = {
  'UX Psychology': '#B24A58',
  'Strategic Thinking': '#2E8A75',
  'Research': '#3B72B2',
  'Design & Craft': '#6B46C1',
  'Evaluation & Optimization': '#C85A32',
  'Systems & Professional Practice': '#C77D1E',
};



export function getGroupDescription(groupTitle: string): string {
  return GROUP_DESCRIPTIONS[groupTitle] || 'Essential UX methods, models, and frameworks.';
}

export function getGroupColor(groupTitle: string): string {
  return GROUP_COLORS[groupTitle] || '#1A1A1A';
}

export function getDomain(id: string): Domain | undefined {
  if (!id) return undefined;
  const normId = id.toLowerCase().trim();
  return DOMAINS.find((d) => d.id === normId || d.title.toLowerCase().trim() === normId);
}

export function getDomainGroup(domainId: string): DomainGroup | undefined {
  if (!domainId) return undefined;
  const normId = domainId.toLowerCase().trim();
  return DOMAIN_GROUPS.find((group) => group.domainIds.includes(normId));
}

