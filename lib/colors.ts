export interface LawsOfUXColor {
  hex: string;
  name: string;
  bgClass: string;
  textClass: string;
}

export const LAWS_OF_UX_PALETTE: readonly LawsOfUXColor[] = [
  { hex: '#E75A4B', name: 'Coral', bgClass: 'bg-[#E75A4B]', textClass: 'text-white' },
  { hex: '#2E8A75', name: 'Teal', bgClass: 'bg-[#2E8A75]', textClass: 'text-white' },
  { hex: '#C77D1E', name: 'Ochre', bgClass: 'bg-[#C77D1E]', textClass: 'text-white' },
  { hex: '#3B72B2', name: 'Slate Blue', bgClass: 'bg-[#3B72B2]', textClass: 'text-white' },
  { hex: '#6B46C1', name: 'Plum', bgClass: 'bg-[#6B46C1]', textClass: 'text-white' },
  { hex: '#C85A32', name: 'Terracotta', bgClass: 'bg-[#C85A32]', textClass: 'text-white' },
  { hex: '#10B981', name: 'Emerald', bgClass: 'bg-[#10B981]', textClass: 'text-white' },
  { hex: '#D946EF', name: 'Rose', bgClass: 'bg-[#D946EF]', textClass: 'text-white' },
  { hex: '#4F46E5', name: 'Indigo', bgClass: 'bg-[#4F46E5]', textClass: 'text-white' },
  { hex: '#D97706', name: 'Amber', bgClass: 'bg-[#D97706]', textClass: 'text-white' },
  { hex: '#2563EB', name: 'Royal Blue', bgClass: 'bg-[#2563EB]', textClass: 'text-white' },
  { hex: '#059669', name: 'Forest', bgClass: 'bg-[#059669]', textClass: 'text-white' },
  { hex: '#DC2626', name: 'Crimson', bgClass: 'bg-[#DC2626]', textClass: 'text-white' },
  { hex: '#7C3AED', name: 'Violet', bgClass: 'bg-[#7C3AED]', textClass: 'text-white' },
] as const;

export function getCategoryColor(categoryId: string): LawsOfUXColor {
  let hash = 0;
  for (let i = 0; i < categoryId.length; i++) {
    hash = categoryId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % LAWS_OF_UX_PALETTE.length;
  return LAWS_OF_UX_PALETTE[index];
}

export function getGroupColor(index: number): LawsOfUXColor {
  return LAWS_OF_UX_PALETTE[index % LAWS_OF_UX_PALETTE.length];
}
