import { describe, expect, test } from 'bun:test';
import { inferKind } from './inferKind';

describe('inferKind classification engine', () => {
  test('correctly infers concepts', () => {
    expect(inferKind("Hick's Law", 'ux-psychology', 'hicks-law')).toBe('concept');
    expect(inferKind('Mental Models', 'ux-psychology', 'mental-models')).toBe('concept');
    expect(inferKind('Loss Aversion', 'ux-psychology', 'loss-aversion')).toBe('concept');
    expect(inferKind('Cognitive Load', 'ux-psychology', 'cognitive-load')).toBe('concept');
    expect(inferKind('Gestalt Principles', 'visual-design', 'gestalt-principles')).toBe('concept');
    expect(inferKind('First Principles', 'strategic-thinking', 'first-principles')).toBe('concept');
  });

  test('correctly infers frameworks', () => {
    expect(inferKind('Kano Model', 'strategic-thinking', 'kano-model')).toBe('framework');
    expect(inferKind('RICE', 'strategic-thinking', 'rice')).toBe('framework');
    expect(inferKind('HEART', 'strategic-thinking', 'heart')).toBe('framework');
    expect(inferKind('Eisenhower Matrix', 'strategic-thinking', 'eisenhower-matrix')).toBe('framework');
    expect(inferKind('Business Model Canvas', 'strategic-thinking', 'business-model-canvas')).toBe('framework');
    expect(inferKind('Journey Mapping', 'research-synthesis', 'journey-mapping')).toBe('framework');
    expect(inferKind('Empathy Maps', 'research-synthesis', 'empathy-maps')).toBe('framework');
    expect(inferKind('KPI Trees', 'metrics-experimentation', 'kpi-trees')).toBe('framework');
  });

  test('correctly infers methods', () => {
    expect(inferKind('User Interviews', 'qualitative-research', 'user-interviews')).toBe('method');
    expect(inferKind('A/B Testing', 'evaluation', 'a-b-testing')).toBe('method');
    expect(inferKind('Card Sorting', 'ia-structure', 'card-sorting')).toBe('method');
    expect(inferKind('Usability Testing', 'evaluation', 'usability-testing')).toBe('method');
    expect(inferKind('UX Writing', 'content-design', 'ux-writing')).toBe('method');
    expect(inferKind('Competitive Analysis', 'research-synthesis', 'competitive-analysis')).toBe('method');
  });
});
