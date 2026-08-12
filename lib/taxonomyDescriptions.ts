/**
 * 1-line descriptions for taxonomy items to populate category card grids
 * when full MDX content has not yet been authored.
 */
export const TAXONOMY_DESCRIPTIONS: Record<string, string> = {
  // UX Psychology
  'mental-models': 'How users perceive and understand how a product or system operates.',
  'cognitive-load': 'The amount of mental effort required to process information and complete a task.',
  'hicks-law': 'The time it takes to make a decision increases with the number and complexity of choices.',
  'fitts-law': 'The time to acquire a target is a function of the distance to and size of the target.',
  'millers-law': 'The average person can only keep 7 (plus or minus 2) items in working memory.',
  'peak-end-rule': 'People judge an experience based primarily on how they felt at its peak and end.',
  'goal-gradient-effect': 'Users accelerate their efforts as they get closer to achieving a goal.',
  'habit-loop': 'A cue, routine, and reward framework that drives repeating user behaviors.',
  'dual-process-theory': 'Fast intuitive thinking (System 1) vs slow deliberate reasoning (System 2).',
  'loss-aversion': 'The pain of losing something is psychologically twice as powerful as the pleasure of gaining it.',
  'anchoring': 'People rely heavily on the first piece of information offered when making decisions.',
  'availability-bias': 'Estimating likelihood based on how easily examples come to mind.',
  'confirmation-bias': 'Seeking and valuing information that aligns with existing beliefs.',
  'social-proof': 'People copy the actions of others in an attempt to undertake behavior in a given situation.',
  'reciprocity': 'The urge to respond to a positive action with another positive action.',
  'scarcity': 'Perceiving limited-quantity or limited-time items as more valuable.',
  'progress-principle': 'Small wins and visible progress significantly boost user motivation.',
  'behavioral-economics-basics': 'Understanding cognitive biases that drive real-world decision making.',
  'jakobs-law': 'Users spend most of their time on other sites, so they prefer yours to work similarly.',
  'teslers-law': 'Every application has an inherent amount of complexity that cannot be removed.',
  'postels-law': 'Be conservative in what you do, be liberal in what you accept from others.',
  'doherty-threshold': 'Productivity increases when a system responds in under 400ms.',
  'von-restorff-effect': 'Items that stand out visually are more likely to be remembered.',
  'serial-position-effect': 'Users best remember the first and last items in a series.',
  'zeigarnik-effect': 'Incomplete or interrupted tasks are remembered better than completed ones.',
  'aesthetic-usability-effect': 'Users perceive visually pleasing designs as more usable.',
  'choice-overload': 'Too many options leads to decision paralysis and reduced satisfaction.',
  'default-effect': 'Users tend to stick with pre-selected options rather than changing them.',
  'framing-effect': 'Information presentation shapes user perception and choices.',
  'sunk-cost-fallacy': 'Continuing an action due to previously invested time or effort.',
  'survivorship-bias': 'Focusing on successful outcomes while ignoring failures.',
  'endowment-effect': 'Valuing things more highly simply because you own them.',
  'ikea-effect': 'Placing disproportionately high value on products users helped create.',
  'weber-fechner-law': 'Just noticeable differences depend on initial stimulus magnitude.',
  'fogg-behavior-model': 'Behavior occurs when motivation, ability, and a prompt converge.',
  'com-b': 'Behavior changes through Capability, Opportunity, and Motivation.',
  'self-determination-theory': 'Autonomy, competence, and relatedness drive intrinsic motivation.',
  'hook-model': 'Trigger, action, variable reward, and investment create habit-forming products.',
  'flow': 'A state of deep focus and immersion when challenge matches user skill.',

  // Strategic Thinking
  'product-market-fit': 'Aligning product capabilities with strong market demand.',
  'jobs-to-be-done': 'Understanding the core job users are hiring your product to achieve.',
  'north-star-metric': 'The single key metric that best reflects long-term customer value creation.',
  'pirate-metrics-aarrr': 'Acquisition, Activation, Retention, Referral, and Revenue framework.',
  'heart': 'Happiness, Engagement, Adoption, Retention, Task Success metric suite.',
  'okrs': 'Objectives and Key Results framework for ambitious goal alignment.',
  'opportunity-solution-tree': 'Visual mapping connecting business goals to user problems and solutions.',
  'kano-model': 'Classifying product features based on customer satisfaction impact.',
  'rice': 'Prioritizing initiatives by Reach, Impact, Confidence, and Effort.',
  'ice': 'Quick prioritization by Impact, Confidence, and Ease.',
  'moscow': 'Categorizing requirements into Must, Should, Could, and Won\'t have.',
  'cost-vs-value': 'Balancing implementation effort against potential business impact.',
  'product-strategy': 'Defining how product initiatives will achieve business goals.',
  'value-proposition-canvas': 'Ensuring products fit customer jobs, pains, and gains.',
  'business-model-canvas': 'Strategic template documenting business model dimensions.',
  'wsjf': 'Weighted Shortest Job First for lean prioritization.',

  // Research & Synthesis
  'affinity-diagramming': 'Grouping qualitative findings into meaningful thematic clusters.',
  'thematic-analysis': 'Systematically identifying and reporting patterns across qualitative data.',
  'empathy-mapping': 'Visualizing what users say, think, do, and feel during an experience.',
  'journey-mapping': 'Mapping end-to-end user experiences, touchpoints, and pain points over time.',
  'persona-creation': 'Synthesizing user archetypes based on empirical research findings.',
  'service-blueprinting': 'Mapping frontstage user interactions with backstage operational processes.',
  'storyboarding': 'Visualizing user scenarios through sequential illustrative scenes.',
  'customer-journey-analytics': 'Tracking quantitative user flow metrics across touchpoints.',

  // Qualitative Research
  'user-interviews': 'One-on-one structured or semi-structured conversations to explore user needs.',
  'contextual-inquiry': 'Observing and interviewing users in their natural environment.',
  'focus-groups': 'Guided group discussions to gauge reactions and sentiments.',
  'diary-studies': 'Longitudinal self-reporting by users documenting daily behaviors and thoughts.',
  'ethnographic-field-studies': 'Immersive field observation of user behaviors in context.',
  'co-design-workshops': 'Collaborative design sessions involving users in the creation process.',

  // Quantitative Research
  'seq': 'Single Ease Question assessing task difficulty immediately post-task.',
  'sus': 'System Usability Scale delivering a 10-item standard usability score.',
  'umux-lite': 'Compact 2-item usability metric measuring effectiveness and ease.',
  'nps': 'Net Promoter Score measuring customer loyalty and willingness to recommend.',
  'csat': 'Customer Satisfaction Score gauging immediate user satisfaction.',
  'clickstream-analysis': 'Analyzing user navigation paths and interaction event sequences.',

  // Evaluation & Accessibility
  'usability-testing': 'Evaluating a product by testing it with representative users.',
  'heuristic-evaluation': 'Expert assessment of an interface against established UX principles.',
  'cognitive-walkthrough': 'Evaluating step-by-step ease of learning for new users.',
  'a-b-testing': 'Comparing two variations to determine which performs better.',
  'accessibility-audit': 'Assessing digital products against WCAG guidelines for accessibility.',
  'expert-review': 'UX specialist review identifying usability flaws and improvements.',
};

export function get1Liner(id: string, fallbackTitle: string): string {
  if (TAXONOMY_DESCRIPTIONS[id]) {
    return TAXONOMY_DESCRIPTIONS[id];
  }
  return `Essential concept and practical methodology for ${fallbackTitle.toLowerCase()}.`;
}
