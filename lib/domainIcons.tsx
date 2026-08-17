import React from 'react';
import {
  Brain,
  Compass,
  Flask,
  Chats,
  ChartBar,
  Lightbulb,
  TreeStructure,
  CursorClick,
  Article,
  Palette,
  DeviceMobile,
  ShieldCheck,
  PersonSimpleCircle,
  Sparkle,
  TrendUp,
  Path,
  Cube,
  PresentationChart,
  Megaphone,
  Briefcase,
  SquaresFour,
  type IconWeight,
} from '@phosphor-icons/react';

interface IconOptions {
  weight?: IconWeight;
  size?: number;
  className?: string;
}

const DEFAULT_ICON_PROPS: IconOptions = {
  size: 104,
  weight: 'regular',
  className: 'text-white transition-transform duration-300 group-hover:scale-105',
};

export const DOMAIN_ICONS: Record<string, (props?: IconOptions) => React.ReactNode> = {
  // 01 UX Psychology
  'ux-psychology': (props = DEFAULT_ICON_PROPS) => (
    <Brain size={props.size ?? DEFAULT_ICON_PROPS.size} weight={props.weight ?? DEFAULT_ICON_PROPS.weight} className={props.className ?? DEFAULT_ICON_PROPS.className} />
  ),

  // 02 Strategic Thinking
  'strategic-thinking': (props = DEFAULT_ICON_PROPS) => (
    <Compass size={props.size ?? DEFAULT_ICON_PROPS.size} weight={props.weight ?? DEFAULT_ICON_PROPS.weight} className={props.className ?? DEFAULT_ICON_PROPS.className} />
  ),

  // 03 Research & Synthesis
  'research-synthesis': (props = DEFAULT_ICON_PROPS) => (
    <Flask size={props.size ?? DEFAULT_ICON_PROPS.size} weight={props.weight ?? DEFAULT_ICON_PROPS.weight} className={props.className ?? DEFAULT_ICON_PROPS.className} />
  ),

  // 04 Qualitative Research
  'qualitative-research': (props = DEFAULT_ICON_PROPS) => (
    <Chats size={props.size ?? DEFAULT_ICON_PROPS.size} weight={props.weight ?? DEFAULT_ICON_PROPS.weight} className={props.className ?? DEFAULT_ICON_PROPS.className} />
  ),

  // 05 Quantitative Research
  'quantitative-research': (props = DEFAULT_ICON_PROPS) => (
    <ChartBar size={props.size ?? DEFAULT_ICON_PROPS.size} weight={props.weight ?? DEFAULT_ICON_PROPS.weight} className={props.className ?? DEFAULT_ICON_PROPS.className} />
  ),

  // 06 Ideation
  'ideation': (props = DEFAULT_ICON_PROPS) => (
    <Lightbulb size={props.size ?? DEFAULT_ICON_PROPS.size} weight={props.weight ?? DEFAULT_ICON_PROPS.weight} className={props.className ?? DEFAULT_ICON_PROPS.className} />
  ),

  // 07 IA & Structure
  'ia-structure': (props = DEFAULT_ICON_PROPS) => (
    <TreeStructure size={props.size ?? DEFAULT_ICON_PROPS.size} weight={props.weight ?? DEFAULT_ICON_PROPS.weight} className={props.className ?? DEFAULT_ICON_PROPS.className} />
  ),

  // 08 Interaction Design
  'interaction-design': (props = DEFAULT_ICON_PROPS) => (
    <CursorClick size={props.size ?? DEFAULT_ICON_PROPS.size} weight={props.weight ?? DEFAULT_ICON_PROPS.weight} className={props.className ?? DEFAULT_ICON_PROPS.className} />
  ),

  // 09 Content Design
  'content-design': (props = DEFAULT_ICON_PROPS) => (
    <Article size={props.size ?? DEFAULT_ICON_PROPS.size} weight={props.weight ?? DEFAULT_ICON_PROPS.weight} className={props.className ?? DEFAULT_ICON_PROPS.className} />
  ),

  // 10 Visual Design
  'visual-design': (props = DEFAULT_ICON_PROPS) => (
    <Palette size={props.size ?? DEFAULT_ICON_PROPS.size} weight={props.weight ?? DEFAULT_ICON_PROPS.weight} className={props.className ?? DEFAULT_ICON_PROPS.className} />
  ),

  // 11 Prototyping
  'prototyping': (props = DEFAULT_ICON_PROPS) => (
    <DeviceMobile size={props.size ?? DEFAULT_ICON_PROPS.size} weight={props.weight ?? DEFAULT_ICON_PROPS.weight} className={props.className ?? DEFAULT_ICON_PROPS.className} />
  ),

  // 12 Evaluation
  'evaluation': (props = DEFAULT_ICON_PROPS) => (
    <ShieldCheck size={props.size ?? DEFAULT_ICON_PROPS.size} weight={props.weight ?? DEFAULT_ICON_PROPS.weight} className={props.className ?? DEFAULT_ICON_PROPS.className} />
  ),

  // 13 Accessibility
  'accessibility': (props = DEFAULT_ICON_PROPS) => (
    <PersonSimpleCircle size={props.size ?? DEFAULT_ICON_PROPS.size} weight={props.weight ?? DEFAULT_ICON_PROPS.weight} className={props.className ?? DEFAULT_ICON_PROPS.className} />
  ),

  // 14 AI Design
  'ai-design': (props = DEFAULT_ICON_PROPS) => (
    <Sparkle size={props.size ?? DEFAULT_ICON_PROPS.size} weight={props.weight ?? DEFAULT_ICON_PROPS.weight} className={props.className ?? DEFAULT_ICON_PROPS.className} />
  ),

  // 15 Metrics & Experimentation
  'metrics-experimentation': (props = DEFAULT_ICON_PROPS) => (
    <TrendUp size={props.size ?? DEFAULT_ICON_PROPS.size} weight={props.weight ?? DEFAULT_ICON_PROPS.weight} className={props.className ?? DEFAULT_ICON_PROPS.className} />
  ),

  // 16 Service Design
  'service-design': (props = DEFAULT_ICON_PROPS) => (
    <Path size={props.size ?? DEFAULT_ICON_PROPS.size} weight={props.weight ?? DEFAULT_ICON_PROPS.weight} className={props.className ?? DEFAULT_ICON_PROPS.className} />
  ),

  // 17 Design Systems
  'design-systems': (props = DEFAULT_ICON_PROPS) => (
    <Cube size={props.size ?? DEFAULT_ICON_PROPS.size} weight={props.weight ?? DEFAULT_ICON_PROPS.weight} className={props.className ?? DEFAULT_ICON_PROPS.className} />
  ),

  // 18 Facilitation
  'facilitation': (props = DEFAULT_ICON_PROPS) => (
    <PresentationChart size={props.size ?? DEFAULT_ICON_PROPS.size} weight={props.weight ?? DEFAULT_ICON_PROPS.weight} className={props.className ?? DEFAULT_ICON_PROPS.className} />
  ),

  // 19 Communication
  'communication': (props = DEFAULT_ICON_PROPS) => (
    <Megaphone size={props.size ?? DEFAULT_ICON_PROPS.size} weight={props.weight ?? DEFAULT_ICON_PROPS.weight} className={props.className ?? DEFAULT_ICON_PROPS.className} />
  ),

  // 20 Career & Practice
  'career-practice': (props = DEFAULT_ICON_PROPS) => (
    <Briefcase size={props.size ?? DEFAULT_ICON_PROPS.size} weight={props.weight ?? DEFAULT_ICON_PROPS.weight} className={props.className ?? DEFAULT_ICON_PROPS.className} />
  ),
};

export function getDomainIcon(id: string, options?: IconOptions): React.ReactNode {
  const renderer = DOMAIN_ICONS[id];
  if (renderer) return renderer(options);
  const opts = { ...DEFAULT_ICON_PROPS, ...options };
  return <SquaresFour size={opts.size} weight={opts.weight} className={opts.className} />;
}
