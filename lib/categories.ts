export interface Category {
  id: string;
  number: string;
  title: string;
}

export const CATEGORIES: readonly Category[] = [
  { id: 'foundations', number: '01', title: 'Foundations' },
  { id: 'starting-a-project', number: '02', title: 'Starting a Project' },
  { id: 'research-ops-ethics', number: '03', title: 'Research Ops & Ethics' },
  { id: 'qualitative-research', number: '04', title: 'Qualitative Research' },
  { id: 'quantitative-research', number: '05', title: 'Quantitative Research' },
  { id: 'synthesis', number: '06', title: 'Synthesis' },
  { id: 'ideation', number: '07', title: 'Ideation' },
  { id: 'ia-structure', number: '08', title: 'IA & Structure' },
  { id: 'interaction-design', number: '09', title: 'Interaction Design' },
  { id: 'content-design', number: '10', title: 'Content Design' },
  { id: 'visual-design', number: '11', title: 'Visual Design' },
  { id: 'prototyping', number: '12', title: 'Prototyping' },
  { id: 'evaluation', number: '13', title: 'Evaluation' },
  { id: 'accessibility', number: '14', title: 'Accessibility' },
  { id: 'service-design', number: '15', title: 'Service Design' },
  { id: 'ai-design', number: '16', title: 'AI Design' },
  { id: 'metrics-experimentation', number: '17', title: 'Metrics & Experimentation' },
  { id: 'design-systems', number: '18', title: 'Design Systems' },
  { id: 'facilitation', number: '19', title: 'Facilitation' },
  { id: 'communication', number: '20', title: 'Communication' },
  { id: 'career-practice', number: '21', title: 'Career & Practice' },
] as const;

export function getCategory(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}
