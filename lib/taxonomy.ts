/**
 * The full ~310-entry taxonomy from docs/superpowers/specs/2026-08-05-ux-methods-cheatsheet-design.md §4,
 * transcribed as structured data so category pages can render every planned
 * entry as a card — written or not — instead of only what has content today.
 * Source of truth for entry lists remains §4; keep this in sync with it.
 */

export interface TaxonomyItem {
  id: string;
  title: string;
}

export interface TaxonomyGroup {
  /** null for categories with no named subgroups (a single flat list) */
  title: string | null;
  items: TaxonomyItem[];
}

export interface TaxonomyCategory {
  categoryId: string;
  groups: TaxonomyGroup[];
}

export const TAXONOMY: readonly TaxonomyCategory[] = [
  {
    categoryId: 'ux-psychology',
    groups: [
      {
        title: 'Cognition',
        items: [
          { id: 'mental-models', title: 'Mental Models' },
          { id: 'cognitive-load', title: 'Cognitive Load' },
          { id: 'millers-law', title: "Miller's Law" },
          { id: 'dual-process-theory', title: 'Dual Process Theory' },
          { id: 'serial-position-effect', title: 'Serial Position Effect' },
          { id: 'von-restorff-effect', title: 'Von Restorff Effect' },
          { id: 'zeigarnik-effect', title: 'Zeigarnik Effect' },
        ],
      },
      {
        title: 'Perception',
        items: [
          { id: 'weber-fechner-law', title: 'Weber–Fechner Law' },
          { id: 'gestalt-principles', title: 'Gestalt Principles' },
        ],
      },
      {
        title: 'Bias & Decisions',
        items: [
          { id: 'hicks-law', title: "Hick's Law" },
          { id: 'loss-aversion', title: 'Loss Aversion' },
          { id: 'anchoring', title: 'Anchoring' },
          { id: 'availability-bias', title: 'Availability Bias' },
          { id: 'confirmation-bias', title: 'Confirmation Bias' },
          { id: 'choice-overload', title: 'Choice Overload' },
          { id: 'default-effect', title: 'Default Effect' },
          { id: 'framing-effect', title: 'Framing Effect' },
          { id: 'sunk-cost-fallacy', title: 'Sunk Cost Fallacy' },
          { id: 'survivorship-bias', title: 'Survivorship Bias' },
          { id: 'endowment-effect', title: 'Endowment Effect' },
          { id: 'ikea-effect', title: 'IKEA Effect' },
          { id: 'behavioral-economics-basics', title: 'Behavioral Economics Basics' },
          { id: 'aesthetic-usability-effect', title: 'Aesthetic-Usability Effect' },
        ],
      },
      {
        title: 'Motivation',
        items: [
          { id: 'goal-gradient-effect', title: 'Goal Gradient Effect' },
          { id: 'habit-loop', title: 'Habit Loop' },
          { id: 'self-determination-theory', title: 'Self-Determination Theory' },
          { id: 'scarcity', title: 'Scarcity' },
          { id: 'progress-principle', title: 'Progress Principle' },
          { id: 'fogg-behavior-model', title: 'Fogg Behavior Model' },
          { id: 'com-b', title: 'COM-B' },
          { id: 'hook-model', title: 'Hook Model' },
          { id: 'flow', title: 'Flow' },
        ],
      },
      {
        title: 'Emotion & Social',
        items: [
          { id: 'peak-end-rule', title: 'Peak-End Rule' },
          { id: 'social-proof', title: 'Social Proof' },
          { id: 'reciprocity', title: 'Reciprocity' },
        ],
      },
      {
        title: 'Interaction',
        items: [
          { id: 'fitts-law', title: "Fitts's Law" },
          { id: 'jakobs-law', title: "Jakob's Law" },
          { id: 'teslers-law', title: "Tesler's Law" },
          { id: 'doherty-threshold', title: 'Doherty Threshold' },
          { id: 'postels-law', title: "Postel's Law" },
        ],
      },
    ],
  },
  {
    categoryId: 'strategic-thinking',
    groups: [
      {
        title: 'Product Thinking',
        items: [
          { id: 'product-market-fit', title: 'Product-Market Fit' },
          { id: 'jobs-to-be-done', title: 'Jobs To Be Done' },
          { id: 'north-star-metric', title: 'North Star Metric' },
          { id: 'pirate-metrics-aarrr', title: 'Pirate Metrics (AARRR)' },
          { id: 'heart', title: 'HEART' },
          { id: 'okrs', title: 'OKRs' },
          { id: 'opportunity-solution-tree', title: 'Opportunity Solution Tree' },
          { id: 'kano-model', title: 'Kano Model' },
          { id: 'rice', title: 'RICE' },
          { id: 'ice', title: 'ICE' },
          { id: 'moscow', title: 'MoSCoW' },
          { id: 'cost-vs-value', title: 'Cost vs Value' },
          { id: 'product-strategy', title: 'Product Strategy' },
          { id: 'value-proposition-canvas', title: 'Value Proposition Canvas' },
          { id: 'business-model-canvas', title: 'Business Model Canvas' },
          { id: 'wsjf', title: 'WSJF' },
          { id: 'cost-of-delay', title: 'Cost of Delay' },
          { id: 'buy-a-feature', title: 'Buy-a-Feature' },
          { id: 'impact-effort-matrix', title: 'Impact/Effort Matrix' },
        ],
      },
      {
        title: 'Systems Thinking',
        items: [
          { id: 'feedback-loops', title: 'Feedback Loops' },
          { id: 'stocks-and-flows', title: 'Stocks & Flows' },
          { id: 'leverage-points', title: 'Leverage Points' },
          { id: 'second-order-effects', title: 'Second Order Effects' },
          { id: 'emergent-behavior', title: 'Emergent Behavior' },
          { id: 'causal-loop-diagrams', title: 'Causal Loop Diagrams' },
          { id: 'system-mapping', title: 'System Mapping' },
          { id: 'actor-network', title: 'Actor Network' },
          { id: 'cynefin-framework', title: 'Cynefin Framework' },
        ],
      },
      {
        title: 'Decision Making',
        items: [
          { id: 'first-principles', title: 'First Principles' },
          { id: 'inversion', title: 'Inversion' },
          { id: 'ooda-loop', title: 'OODA Loop' },
          { id: 'rapid', title: 'RAPID' },
          { id: 'daci', title: 'DACI' },
          { id: 'eisenhower-matrix', title: 'Eisenhower Matrix' },
          { id: 'pareto-principle', title: 'Pareto Principle' },
          { id: 'expected-value', title: 'Expected Value' },
          { id: 'opportunity-cost', title: 'Opportunity Cost' },
          { id: 'assumption-mapping', title: 'Assumption Mapping' },
          { id: 'risk-matrix', title: 'Risk Matrix' },
          { id: 'decision-trees', title: 'Decision Trees' },
          { id: 'pre-mortem', title: 'Pre-mortem' },
          { id: 'red-teaming', title: 'Red Teaming' },
          { id: 'six-thinking-hats', title: 'Six Thinking Hats' },
        ],
      },
      {
        title: 'Process Frameworks',
        items: [
          { id: 'double-diamond', title: 'Double Diamond' },
          { id: 'design-thinking', title: 'Design Thinking' },
          { id: 'lean-ux', title: 'Lean UX' },
          { id: 'google-design-sprint', title: 'Google Design Sprint' },
          { id: 'continuous-discovery', title: 'Continuous Discovery' },
          { id: 'story-mapping', title: 'Story Mapping' },
          { id: 'working-backwards-pr-faq', title: 'Working Backwards / PR-FAQ' },
        ],
      },
    ],
  },
  {
    categoryId: 'research-synthesis',
    groups: [
      {
        title: 'Framing & Planning',
        items: [
          { id: 'problem-framing', title: 'Problem Framing' },
          { id: 'stakeholder-interviews', title: 'Stakeholder Interviews' },
          { id: 'kickoff-workshop', title: 'Kickoff Workshop' },
          { id: 'project-brief', title: 'Project Brief' },
          { id: 'goal-setting', title: 'Goal Setting' },
          { id: 'research-plan', title: 'Research Plan' },
          { id: 'success-metrics', title: 'Success Metrics' },
          { id: 'constraints-mapping', title: 'Constraints Mapping' },
          { id: 'scope-definition', title: 'Scope Definition' },
          { id: 'competitive-analysis', title: 'Competitive Analysis' },
          { id: 'literature-review', title: 'Literature Review' },
          { id: 'heuristic-review', title: 'Heuristic Review' },
          { id: 'risk-assessment', title: 'Risk Assessment' },
        ],
      },
      {
        title: 'Research Operations',
        items: [
          { id: 'screener-design', title: 'Screener Design' },
          { id: 'participant-recruitment', title: 'Participant Recruitment' },
          { id: 'incentives', title: 'Incentives' },
          { id: 'research-repository', title: 'Research Repository' },
          { id: 'atomic-research', title: 'Atomic Research' },
          { id: 'sample-size-and-saturation', title: 'Sample Size & Saturation' },
          { id: 'session-logistics-and-note-taking', title: 'Session Logistics & Note-taking' },
        ],
      },
      {
        title: 'Synthesis',
        items: [
          { id: 'affinity-mapping', title: 'Affinity Mapping' },
          { id: 'thematic-analysis', title: 'Thematic Analysis' },
          { id: 'qualitative-coding', title: 'Qualitative Coding' },
          { id: 'journey-mapping', title: 'Journey Mapping' },
          { id: 'experience-mapping', title: 'Experience Mapping' },
          { id: 'personas', title: 'Personas' },
          { id: 'proto-personas', title: 'Proto Personas' },
          { id: 'empathy-maps', title: 'Empathy Maps' },
          { id: 'insight-statements', title: 'Insight Statements' },
          { id: 'opportunity-areas', title: 'Opportunity Areas' },
          { id: 'jtbd-statements', title: 'JTBD Statements' },
          { id: 'pov-statements', title: 'POV Statements' },
          { id: 'hmw-questions', title: 'HMW Questions' },
        ],
      },
    ],
  },
  {
    categoryId: 'qualitative-research',
    groups: [
      {
        title: 'Interview Research',
        items: [
          { id: 'user-interviews', title: 'User Interviews' },
          { id: 'expert-interviews', title: 'Expert Interviews' },
          { id: 'focus-groups', title: 'Focus Groups' },
        ],
      },
      {
        title: 'Contextual Research',
        items: [
          { id: 'contextual-inquiry', title: 'Contextual Inquiry' },
          { id: 'ethnography', title: 'Ethnography' },
          { id: 'observation', title: 'Observation' },
          { id: 'shadowing', title: 'Shadowing' },
          { id: 'fly-on-the-wall-observation', title: 'Fly-on-the-wall Observation' },
          { id: 'diary-studies', title: 'Diary Studies' },
        ],
      },
      {
        title: 'Participatory Research',
        items: [
          { id: 'participatory-design', title: 'Participatory Design' },
          { id: 'co-design-workshops', title: 'Co-design Workshops' },
          { id: 'cultural-probes', title: 'Cultural Probes' },
        ],
      },
      {
        title: 'Behavioral Science',
        items: [
          { id: 'think-aloud', title: 'Think Aloud' },
          { id: 'retrospective-think-aloud', title: 'Retrospective Think Aloud' },
        ],
      },
      {
        title: 'Research Analysis',
        items: [{ id: 'grounded-theory', title: 'Grounded Theory' }],
      },
      {
        title: 'Research Rigor',
        items: [
          { id: 'triangulation', title: 'Triangulation' },
          { id: 'mixed-methods-design', title: 'Mixed-Methods Design' },
          { id: 'inter-rater-reliability', title: 'Inter-rater Reliability' },
        ],
      },
    ],
  },
  {
    categoryId: 'quantitative-research',
    groups: [
      {
        title: 'Product Analytics',
        items: [
          { id: 'analytics', title: 'Analytics' },
          { id: 'funnel-analysis', title: 'Funnel Analysis' },
          { id: 'retention-analysis', title: 'Retention Analysis' },
          { id: 'cohort-analysis', title: 'Cohort Analysis' },
          { id: 'heatmaps', title: 'Heatmaps' },
          { id: 'session-recordings', title: 'Session Recordings' },
          { id: 'click-tracking', title: 'Click Tracking' },
          { id: 'tracking-plan-and-instrumentation', title: 'Tracking & Instrumentation' },
        ],
      },
      {
        title: 'Quantitative Usability',
        items: [
          { id: 'benchmark-studies', title: 'Benchmark Studies' },
          { id: 'task-success-rate', title: 'Task Success Rate' },
          { id: 'time-on-task', title: 'Time on Task' },
          { id: 'error-rate', title: 'Error Rate' },
          { id: 'first-click-testing', title: 'First-Click Testing' },
          { id: '5-second-test', title: '5-Second Test' },
          { id: 'seq', title: 'SEQ' },
        ],
      },
      {
        title: 'Surveys & Scales',
        items: [
          { id: 'surveys', title: 'Surveys' },
          { id: 'sus', title: 'SUS' },
          { id: 'umux', title: 'UMUX' },
          { id: 'umux-lite', title: 'UMUX-Lite' },
          { id: 'supr-q', title: 'SUPR-Q' },
          { id: 'nasa-tlx', title: 'NASA-TLX' },
          { id: 'nps', title: 'NPS' },
          { id: 'ces', title: 'CES' },
          { id: 'desirability-testing', title: 'Desirability Testing' },
        ],
      },
      {
        title: 'Experimentation',
        items: [
          { id: 'multivariate-testing', title: 'Multivariate Testing' },
          { id: 'preference-testing', title: 'Preference Testing' },
        ],
      },
      {
        title: 'Prioritization & Strategy',
        items: [
          { id: 'maxdiff', title: 'MaxDiff' },
          { id: 'conjoint-analysis', title: 'Conjoint Analysis' },
          { id: 'kano-survey', title: 'Kano Survey' },
          { id: 'turf-analysis', title: 'TURF Analysis' },
          { id: 'top-task-analysis', title: 'Top Task Analysis' },
        ],
      },
      {
        title: 'Pricing',
        items: [{ id: 'van-westendorp', title: 'Van Westendorp' }],
      },
    ],
  },
  {
    categoryId: 'ideation',
    groups: [
      {
        title: 'Divergent Thinking',
        items: [
          { id: 'divergent-convergent-thinking', title: 'Divergent–Convergent Thinking' },
          { id: 'brainstorming', title: 'Brainstorming' },
          { id: 'brainwriting', title: 'Brainwriting' },
          { id: 'crazy-8s', title: 'Crazy 8s' },
          { id: 'reverse-brainstorming', title: 'Reverse Brainstorming' },
          { id: 'mind-mapping', title: 'Mind Mapping' },
          { id: 'role-storming', title: 'Role Storming' },
          { id: 'worst-possible-idea', title: 'Worst Possible Idea' },
          { id: 'forced-connections', title: 'Forced Connections' },
        ],
      },
      {
        title: 'Collaborative Ideation',
        items: [
          { id: 'design-studio', title: 'Design Studio' },
          { id: 'bodystorming', title: 'Bodystorming' },
          { id: 'dot-voting', title: 'Dot Voting' },
        ],
      },
      {
        title: 'Analogical & Exploratory',
        items: [
          { id: 'analogous-inspiration', title: 'Analogous Inspiration' },
          { id: 'biomimicry', title: 'Biomimicry' },
        ],
      },
      {
        title: 'Systematic Ideation',
        items: [
          { id: 'scamper', title: 'SCAMPER' },
          { id: 'morphological-matrix', title: 'Morphological Matrix' },
          { id: 'lotus-blossom', title: 'Lotus Blossom' },
        ],
      },
    ],
  },
  {
    categoryId: 'ia-structure',
    groups: [
      {
        title: null,
        items: [
          { id: 'site-maps', title: 'Site Maps' },
          { id: 'user-flows', title: 'User Flows' },
          { id: 'task-flows', title: 'Task Flows' },
          { id: 'information-architecture', title: 'Information Architecture' },
          { id: 'content-inventory', title: 'Content Inventory' },
          { id: 'card-sorting', title: 'Card Sorting' },
          { id: 'tree-testing', title: 'Tree Testing' },
          { id: 'navigation-design', title: 'Navigation Design' },
          { id: 'taxonomy', title: 'Taxonomy' },
          { id: 'labeling', title: 'Labeling' },
        ],
      },
    ],
  },
  {
    categoryId: 'interaction-design',
    groups: [
      {
        title: null,
        items: [
          { id: 'wireframes', title: 'Wireframes' },
          { id: 'state-diagrams', title: 'State Diagrams' },
          { id: 'interaction-patterns', title: 'Interaction Patterns' },
          { id: 'microinteractions', title: 'Microinteractions' },
          { id: 'feedback', title: 'Feedback' },
          { id: 'progressive-disclosure', title: 'Progressive Disclosure' },
          { id: 'empty-states', title: 'Empty States' },
          { id: 'error-handling', title: 'Error Handling' },
          { id: 'onboarding', title: 'Onboarding' },
          { id: 'motion-principles', title: 'Motion Principles' },
        ],
      },
    ],
  },
  {
    categoryId: 'content-design',
    groups: [
      {
        title: null,
        items: [
          { id: 'ux-writing', title: 'UX Writing' },
          { id: 'microcopy', title: 'Microcopy' },
          { id: 'error-message-writing', title: 'Error Message Writing' },
          { id: 'voice-and-tone', title: 'Voice & Tone' },
          { id: 'plain-language-and-readability', title: 'Plain Language & Readability' },
          { id: 'content-strategy', title: 'Content Strategy' },
          { id: 'content-modelling', title: 'Content Modelling' },
          { id: 'localization-and-i18n', title: 'Localization & i18n' },
        ],
      },
    ],
  },
  {
    categoryId: 'visual-design',
    groups: [
      {
        title: null,
        items: [
          { id: 'visual-hierarchy', title: 'Visual Hierarchy' },
          { id: 'typography', title: 'Typography' },
          { id: 'color-theory', title: 'Color Theory' },
          { id: 'contrast', title: 'Contrast' },
          { id: 'spacing', title: 'Spacing' },
          { id: 'layout', title: 'Layout' },
          { id: 'grid-systems', title: 'Grid Systems' },
          { id: 'iconography', title: 'Iconography' },
          { id: 'design-tokens', title: 'Design Tokens' },
        ],
      },
    ],
  },
  {
    categoryId: 'prototyping',
    groups: [
      {
        title: null,
        items: [
          { id: 'paper-prototypes', title: 'Paper Prototypes' },
          { id: 'low-fidelity', title: 'Low Fidelity' },
          { id: 'mid-fidelity', title: 'Mid Fidelity' },
          { id: 'high-fidelity', title: 'High Fidelity' },
          { id: 'interactive-prototypes', title: 'Interactive Prototypes' },
          { id: 'wizard-of-oz', title: 'Wizard of Oz' },
          { id: 'concierge-mvp', title: 'Concierge MVP' },
          { id: 'clickable-prototype', title: 'Clickable Prototype' },
          { id: 'fake-door-test', title: 'Fake Door Test' },
          { id: 'painted-door', title: 'Painted Door' },
          { id: 'smoke-test', title: 'Smoke Test' },
        ],
      },
    ],
  },
  {
    categoryId: 'evaluation',
    groups: [
      {
        title: 'User Testing',
        items: [
          { id: 'usability-testing', title: 'Usability Testing' },
          { id: 'benchmark-testing', title: 'Benchmark Testing' },
          { id: 'longitudinal-testing', title: 'Longitudinal Testing' },
          { id: 'pilot-testing', title: 'Pilot Testing' },
          { id: 'seq', title: 'SEQ' },
        ],
      },
      {
        title: 'Expert Evaluation',
        items: [
          { id: 'heuristic-evaluation', title: 'Heuristic Evaluation' },
          { id: 'expert-review', title: 'Expert Review' },
          { id: 'cognitive-walkthrough', title: 'Cognitive Walkthrough' },
          { id: 'pluralistic-walkthrough', title: 'Pluralistic Walkthrough' },
        ],
      },
      {
        title: 'Comparative Testing',
        items: [
          { id: 'comparative-testing', title: 'Comparative Testing' },
          { id: 'a-b-testing', title: 'A/B Testing' },
        ],
      },
      {
        title: 'Accessibility Evaluation',
        items: [{ id: 'accessibility-audit', title: 'Accessibility Audit' }],
      },
      {
        title: 'Information Architecture Evaluation',
        items: [{ id: 'tree-testing', title: 'Tree Testing' }],
      },
      {
        title: 'Performance Modeling',
        items: [{ id: 'goms-klm', title: 'GOMS / KLM' }],
      },
    ],
  },
  {
    categoryId: 'accessibility',
    groups: [
      {
        title: null,
        items: [
          { id: 'wcag', title: 'WCAG' },
          { id: 'screen-readers', title: 'Screen Readers' },
          { id: 'keyboard-navigation', title: 'Keyboard Navigation' },
          { id: 'focus-states', title: 'Focus States' },
          { id: 'color-blindness', title: 'Color Blindness' },
          { id: 'accessible-forms', title: 'Accessible Forms' },
          { id: 'accessible-tables', title: 'Accessible Tables' },
          { id: 'aria', title: 'ARIA' },
          { id: 'inclusive-design', title: 'Inclusive Design' },
          { id: 'universal-design', title: 'Universal Design' },
          { id: 'cognitive-accessibility', title: 'Cognitive Accessibility' },
          {
            id: 'legal-landscape',
            title: 'Legal Landscape (ADA / EN 301 549 / European Accessibility Act)',
          },
        ],
      },
    ],
  },
  {
    categoryId: 'service-design',
    groups: [
      {
        title: null,
        items: [
          { id: 'service-blueprint', title: 'Service Blueprint' },
          { id: 'stakeholder-maps', title: 'Stakeholder Maps' },
          { id: 'ecosystem-maps', title: 'Ecosystem Maps' },
          { id: 'touchpoint-analysis', title: 'Touchpoint Analysis' },
          { id: 'service-safari', title: 'Service Safari' },
          { id: 'experience-prototyping', title: 'Experience Prototyping' },
          { id: 'backstage-mapping', title: 'Backstage Mapping' },
          { id: 'ethical-design', title: 'Ethical Design' },
        ],
      },
    ],
  },
  {
    categoryId: 'ai-design',
    groups: [
      {
        title: null,
        items: [
          { id: 'prompt-design', title: 'Prompt Design' },
          { id: 'ai-interaction-patterns', title: 'AI Interaction Patterns' },
          { id: 'ai-transparency', title: 'AI Transparency' },
          { id: 'human-in-the-loop', title: 'Human-in-the-loop' },
          { id: 'ai-error-recovery', title: 'AI Error Recovery' },
          { id: 'trust-calibration', title: 'Trust Calibration' },
          { id: 'ai-mental-models', title: 'AI Mental Models' },
          { id: 'explainability', title: 'Explainability' },
          { id: 'confidence-indicators', title: 'Confidence Indicators' },
          { id: 'ai-ethics-and-harm-review', title: 'AI Ethics & Harm Review' },
        ],
      },
    ],
  },
  {
    categoryId: 'metrics-experimentation',
    groups: [
      {
        title: null,
        items: [
          { id: 'kpi-trees', title: 'KPI Trees' },
          { id: 'experiment-design', title: 'Experiment Design' },
          { id: 'statistical-significance', title: 'Statistical Significance' },
          { id: 'confidence-intervals', title: 'Confidence Intervals' },
          { id: 'power-analysis', title: 'Power Analysis' },
          { id: 'leading-vs-lagging-metrics', title: 'Leading vs Lagging Metrics' },
          { id: 'goal-signal-metric', title: 'Goal-Signal-Metric' },
          { id: 'guardrail-and-counter-metrics', title: 'Guardrail & Counter Metrics' },
          { id: 'sample-ratio-mismatch', title: 'Sample Ratio Mismatch' },
          { id: 'novelty-effect', title: 'Novelty Effect' },
          { id: 'the-peeking-problem', title: 'The Peeking Problem' },
          { id: 'quasi-experiments-and-diff-in-diff', title: 'Quasi-experiments & Diff-in-Diff' },
          { id: 'holdout-groups', title: 'Holdout Groups' },
          { id: 'switchback-tests', title: 'Switchback Tests' },
        ],
      },
    ],
  },
  {
    categoryId: 'design-systems',
    groups: [
      {
        title: null,
        items: [
          { id: 'design-system-strategy', title: 'Design System Strategy' },
          { id: 'component-api-design', title: 'Component API Design' },
          { id: 'token-architecture', title: 'Token Architecture' },
          { id: 'governance-models', title: 'Governance Models' },
          { id: 'contribution-model', title: 'Contribution Model' },
          { id: 'component-documentation', title: 'Component Documentation' },
          { id: 'versioning-and-deprecation', title: 'Versioning & Deprecation' },
          { id: 'adoption-measurement', title: 'Adoption Measurement' },
        ],
      },
    ],
  },
  {
    categoryId: 'facilitation',
    groups: [
      {
        title: null,
        items: [
          { id: 'workshop-design', title: 'Workshop Design' },
          { id: 'sprint-planning', title: 'Sprint Planning' },
          { id: 'design-critiques', title: 'Design Critiques' },
          { id: 'retrospectives', title: 'Retrospectives' },
          { id: 'brainstorm-facilitation', title: 'Brainstorm Facilitation' },
          { id: 'silent-voting', title: 'Silent Voting' },
          { id: 'timeboxing', title: 'Timeboxing' },
        ],
      },
    ],
  },
  {
    categoryId: 'communication',
    groups: [
      {
        title: null,
        items: [
          { id: 'ux-reports', title: 'UX Reports' },
          { id: 'executive-summaries', title: 'Executive Summaries' },
          { id: 'research-readouts', title: 'Research Readouts' },
          { id: 'storytelling', title: 'Storytelling' },
          { id: 'design-reviews', title: 'Design Reviews' },
          { id: 'presentations', title: 'Presentations' },
          { id: 'design-rationale', title: 'Design Rationale' },
          { id: 'project-documentation', title: 'Project Documentation' },
        ],
      },
    ],
  },
  {
    categoryId: 'career-practice',
    groups: [
      {
        title: null,
        items: [
          { id: 'portfolio-storytelling', title: 'Portfolio Storytelling' },
          { id: 'case-studies', title: 'Case Studies' },
          { id: 'working-with-pms', title: 'Working with PMs' },
          { id: 'working-with-engineers', title: 'Working with Engineers' },
          { id: 'design-qa', title: 'Design QA' },
          { id: 'prioritization', title: 'Prioritization' },
          { id: 'time-management', title: 'Time Management' },
        ],
      },
    ],
  },
] as const;

export function getTaxonomyForCategory(categoryId: string): TaxonomyCategory | undefined {
  return TAXONOMY.find((c) => c.categoryId === categoryId);
}

export function getTaxonomyEntryCount(categoryId: string): number {
  const tax = getTaxonomyForCategory(categoryId);
  if (!tax) return 0;
  return tax.groups.reduce((sum, g) => sum + g.items.length, 0);
}
