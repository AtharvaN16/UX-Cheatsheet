export interface Category {
  id: string;
  number: string;
  title: string;
}

export interface CategoryGroup {
  title: string;
  categoryIds: string[];
  fillClass: string;
}

export const CATEGORIES: readonly Category[] = [
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

export const CATEGORY_GROUPS: readonly CategoryGroup[] = [
  {
    title: 'UX Psychology',
    categoryIds: ['ux-psychology'],
    fillClass: 'bg-[#E75A4B] text-white border-none',
  },
  {
    title: 'Strategic Thinking',
    categoryIds: ['strategic-thinking'],
    fillClass: 'bg-[#2E8A75] text-white border-none',
  },
  {
    title: 'Research',
    categoryIds: ['research-synthesis', 'qualitative-research', 'quantitative-research'],
    fillClass: 'bg-[#3B72B2] text-white border-none',
  },
  {
    title: 'Design & Craft',
    categoryIds: [
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
    categoryIds: [
      'evaluation',
      'accessibility',
      'ai-design',
      'metrics-experimentation',
    ],
    fillClass: 'bg-[#C85A32] text-white border-none',
  },
  {
    title: 'Systems & Professional Practice',
    categoryIds: [
      'service-design',
      'design-systems',
      'facilitation',
      'communication',
      'career-practice',
    ],
    fillClass: 'bg-[#C77D1E] text-white border-none',
  },
] as const;

export function getCategory(id: string): Category | undefined {
  if (!id) return undefined;
  const normId = id.toLowerCase().trim();
  return CATEGORIES.find((c) => c.id === normId || c.title.toLowerCase().trim() === normId);
}

export function getCategoryGroup(categoryId: string): CategoryGroup | undefined {
  if (!categoryId) return undefined;
  const normId = categoryId.toLowerCase().trim();
  return CATEGORY_GROUPS.find((group) => group.categoryIds.includes(normId));
}
