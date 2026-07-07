export interface RubricCriterion {
  id: string;
  label: string;
  maxPoints: number;
  hint?: string;
}

export interface RubricSubsection {
  title: string;
  criteria: RubricCriterion[];
}

export interface RubricSection {
  id: string;
  title: string;
  maxPoints: number;
  criteria?: RubricCriterion[];
  subsections?: RubricSubsection[];
}

export type RubricScores = Record<string, number>;

export const RUBRIC_SECTION_REPORT_TITLE: Record<string, string> = {
  key_risk_factors: 'Key Risk Factors',
  primary_concerns: 'Primary Concerns',
  clinical_reasoning: 'Clinical Reasoning',
  vital_signs: 'Vital Signs',
  laboratory: 'Laboratory',
  historical_risk: 'Historical Risk',
  follow_up: 'Follow-Up Timing',
};

/** Scoring guidance shown in cross-check tooltips */
export const RUBRIC_CRITERION_HINTS: Record<string, string> = {
  krf_major_medical: 'Check for chronic disease, prior pregnancy complications, anaemia, hypertension, diabetes, HIV, etc.',
  krf_demographic: 'Age, parity, gestation, socioeconomic factors, access to care.',
  krf_social_lifestyle: 'Smoking, alcohol, nutrition, living conditions, support systems.',
  krf_no_hallucination: 'Verify each risk factor is supported by documented history or findings — not invented.',
  pc_chief_complaint: 'Does the output reflect the patient\'s presenting symptom or reason for assessment?',
  pc_main_problems: 'Are the active clinical issues clearly named and distinct from background risks?',
  pc_red_flags: 'Look for danger signs: bleeding, reduced fetal movement, severe pain, pre-eclampsia features, etc.',
  pc_urgency: 'Are the most acute problems listed first and aligned with the risk level?',
  cr_history: 'Is the symptom and obstetric history interpreted correctly in context?',
  cr_examination: 'Are documented exam findings used appropriately (or gaps noted)?',
  cr_investigation: 'Are labs and other investigations woven into the reasoning?',
  cr_synthesis: 'Does the narrative logically connect history, exam, and investigations?',
  cr_most_likely: 'Is a leading diagnosis or clinical impression clearly stated?',
  cr_diff_structured: 'Is the differential organised (not a vague list)?',
  cr_diff_ranked: 'Are alternatives ordered by likelihood and clinical risk?',
  cr_high_risk_dx: 'Are cannot-miss diagnoses included (e.g. eclampsia, abruption, sepsis)?',
  cr_evidence: 'Are conclusions tied to specific findings, not asserted without basis?',
  cr_complications: 'Are plausible complications of the current condition identified?',
  cr_progression: 'Is expected disease course or deterioration considered?',
  cr_monitoring: 'Is ongoing surveillance or repeat assessment planned?',
  cr_rationale: 'Is the management logic explained clearly for a clinician?',
  cr_gap_history: 'Does the AI flag missing or incomplete history elements?',
  cr_gap_exam: 'Are absent or undocumented examination items noted?',
  cr_gap_investigations: 'Are missing labs or imaging identified where needed?',
  cr_gap_priority: 'Are information gaps ranked by clinical importance?',
  cr_local_epi: 'Is Kenya-relevant disease burden or prevalence reflected?',
  cr_resources: 'Are facility limitations and what is realistically available considered?',
  cr_guidelines: 'Do recommendations align with local/national guidance where applicable?',
  cr_referral: 'Is escalation to higher-level care appropriate and specific?',
  cr_feasible: 'Can the suggested actions be done in the patient\'s setting?',
  vs_abnormal: 'Are out-of-range vitals (BP, pulse, temp, SpO₂, etc.) called out?',
  vs_severity: 'Is the degree of abnormality interpreted (mild vs critical)?',
  vs_implications: 'Does the output explain what abnormal vitals mean clinically?',
  vs_escalation: 'Is urgent action triggered when vitals warrant it?',
  lab_abnormal: 'Are deranged lab values identified and named?',
  lab_significance: 'Is clinical meaning of abnormal results explained?',
  lab_integration: 'Do lab findings support or refine the working diagnosis?',
  lab_critical: 'Are life-threatening values flagged (e.g. severe anaemia, critical glucose)?',
  hrf_medical: 'Past medical and obstetric history captured and used?',
  hrf_medication: 'Current medications and allergies considered?',
  hrf_family: 'Relevant family history included where applicable?',
  hrf_social: 'Social determinants and lifestyle factors from history?',
  hrf_interpretation: 'Is background history interpreted, not just listed?',
  fu_interval: 'Is a specific follow-up timeframe given (hours, days, weeks)?',
  fu_urgency: 'Does disposition match severity (routine vs same-day vs emergency)?',
  fu_referral: 'Is referral to hospital/specialist appropriate and justified?',
  fu_safety_net: 'Are warning symptoms and when to return urgently clearly stated?',
  fu_consistency: 'Do follow-up plans align with risk level and clinical reasoning?',
};

export function getCriterionHint(criterionId: string): string {
  return RUBRIC_CRITERION_HINTS[criterionId] ?? 'Compare against the relevant AI report section below.';
}

export const RUBRIC_TOTAL_POINTS = 100;

export const CLINICAL_REASONING_RUBRIC: RubricSection[] = [
  {
    id: 'key_risk_factors',
    title: 'Key Risk Factors',
    maxPoints: 6,
    criteria: [
      { id: 'krf_major_medical', label: 'Major medical risk factors identified', maxPoints: 2 },
      { id: 'krf_demographic', label: 'Demographic risk factors identified', maxPoints: 2 },
      { id: 'krf_social_lifestyle', label: 'Social/lifestyle risk factors included', maxPoints: 1 },
      { id: 'krf_no_hallucination', label: 'No hallucinated or unsupported risk factors', maxPoints: 1 },
    ],
  },
  {
    id: 'primary_concerns',
    title: 'Primary Concerns',
    maxPoints: 12,
    criteria: [
      { id: 'pc_chief_complaint', label: 'Chief complaint correctly identified', maxPoints: 3 },
      { id: 'pc_main_problems', label: 'Main clinical problems identified', maxPoints: 3 },
      { id: 'pc_red_flags', label: 'Red flags identified', maxPoints: 3 },
      { id: 'pc_urgency', label: 'Appropriate prioritization of urgency', maxPoints: 3 },
    ],
  },
  {
    id: 'clinical_reasoning',
    title: 'Clinical Reasoning',
    maxPoints: 40,
    subsections: [
      {
        title: 'Overview',
        criteria: [
          { id: 'cr_history', label: 'History correctly interpreted', maxPoints: 3 },
          { id: 'cr_examination', label: 'Examination findings correctly interpreted', maxPoints: 3 },
          { id: 'cr_investigation', label: 'Investigation integration appropriate', maxPoints: 2 },
          { id: 'cr_synthesis', label: 'Logical synthesis of clinical data', maxPoints: 2 },
        ],
      },
      {
        title: 'Differential Considerations',
        criteria: [
          { id: 'cr_most_likely', label: 'Most likely diagnosis identified', maxPoints: 4 },
          { id: 'cr_diff_structured', label: 'Differential appropriately structured', maxPoints: 2 },
          { id: 'cr_diff_ranked', label: 'Differential appropriately ranked', maxPoints: 2 },
          { id: 'cr_high_risk_dx', label: 'High-risk diagnoses included', maxPoints: 2 },
          { id: 'cr_evidence', label: 'Evidence-based justification provided', maxPoints: 2 },
        ],
      },
      {
        title: 'Future Concerns & Rationale',
        criteria: [
          { id: 'cr_complications', label: 'Complications identified', maxPoints: 2 },
          { id: 'cr_progression', label: 'Disease progression considered', maxPoints: 2 },
          { id: 'cr_monitoring', label: 'Monitoring strategy appropriate', maxPoints: 2 },
          { id: 'cr_rationale', label: 'Clinical rationale clearly explained', maxPoints: 2 },
        ],
      },
      {
        title: 'Information Gaps',
        criteria: [
          { id: 'cr_gap_history', label: 'Missing history identified', maxPoints: 2 },
          { id: 'cr_gap_exam', label: 'Missing examination identified', maxPoints: 1 },
          { id: 'cr_gap_investigations', label: 'Missing investigations identified', maxPoints: 1 },
          { id: 'cr_gap_priority', label: 'Prioritization of gaps appropriate', maxPoints: 1 },
        ],
      },
      {
        title: 'Contextual / Kenya Adaptations',
        criteria: [
          { id: 'cr_local_epi', label: 'Local epidemiology considered', maxPoints: 1 },
          { id: 'cr_resources', label: 'Resource constraints considered', maxPoints: 1 },
          { id: 'cr_guidelines', label: 'Guideline alignment appropriate', maxPoints: 1 },
          { id: 'cr_referral', label: 'Referral pathways appropriate', maxPoints: 1 },
          { id: 'cr_feasible', label: 'Recommendations feasible locally', maxPoints: 1 },
        ],
      },
    ],
  },
  {
    id: 'vital_signs',
    title: 'Vital Signs Assessment',
    maxPoints: 10,
    criteria: [
      { id: 'vs_abnormal', label: 'Abnormal vital signs identified', maxPoints: 3 },
      { id: 'vs_severity', label: 'Severity correctly interpreted', maxPoints: 3 },
      { id: 'vs_implications', label: 'Clinical implications stated', maxPoints: 2 },
      { id: 'vs_escalation', label: 'Urgency appropriately escalated', maxPoints: 2 },
    ],
  },
  {
    id: 'laboratory',
    title: 'Laboratory Interpretation',
    maxPoints: 10,
    criteria: [
      { id: 'lab_abnormal', label: 'Abnormal results identified', maxPoints: 3 },
      { id: 'lab_significance', label: 'Clinical significance interpreted', maxPoints: 3 },
      { id: 'lab_integration', label: 'Integration into diagnosis', maxPoints: 2 },
      { id: 'lab_critical', label: 'Critical abnormalities recognized', maxPoints: 2 },
    ],
  },
  {
    id: 'historical_risk',
    title: 'Historical Risk Factors',
    maxPoints: 10,
    criteria: [
      { id: 'hrf_medical', label: 'Medical history included', maxPoints: 2 },
      { id: 'hrf_medication', label: 'Medication history included', maxPoints: 2 },
      { id: 'hrf_family', label: 'Family history included', maxPoints: 2 },
      { id: 'hrf_social', label: 'Social history included', maxPoints: 2 },
      { id: 'hrf_interpretation', label: 'Clinical interpretation appropriate', maxPoints: 2 },
    ],
  },
  {
    id: 'follow_up',
    title: 'Follow-Up Timing',
    maxPoints: 12,
    criteria: [
      { id: 'fu_interval', label: 'Appropriate follow-up interval', maxPoints: 3 },
      { id: 'fu_urgency', label: 'Correct urgency level', maxPoints: 3 },
      { id: 'fu_referral', label: 'Referral decision appropriate', maxPoints: 3 },
      { id: 'fu_safety_net', label: 'Safety-net advice included', maxPoints: 2 },
      { id: 'fu_consistency', label: 'Consistency with overall assessment', maxPoints: 1 },
    ],
  },
];

export interface ScoreCategory {
  label: string;
  supervision: string;
  min: number;
  max: number;
  color: string;
  bg: string;
  border: string;
}

export const SCORE_CATEGORIES: ScoreCategory[] = [
  { min: 95, max: 100, label: 'Expert-level output', supervision: 'Barely any (Has autonomy)', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  { min: 90, max: 94, label: 'Very Good', supervision: 'Some', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  { min: 80, max: 89, label: 'Good', supervision: 'Some (No autonomous decision-making)', color: '#ca8a04', bg: '#fefce8', border: '#fef08a' },
  { min: 70, max: 79, label: 'Acceptable', supervision: 'Average (No autonomous decision-making)', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
  { min: 0, max: 69, label: 'Unacceptable', supervision: 'Heavy (No autonomous decision-making)', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
];

export function getAllCriteria(): RubricCriterion[] {
  return CLINICAL_REASONING_RUBRIC.flatMap((section) => {
    if (section.criteria) return section.criteria;
    return section.subsections?.flatMap((sub) => sub.criteria) ?? [];
  });
}

export function createEmptyRubricScores(): RubricScores {
  return Object.fromEntries(getAllCriteria().map((c) => [c.id, 0]));
}

export function sumRubricScores(scores: RubricScores): number {
  return getAllCriteria().reduce((total, c) => total + (scores[c.id] ?? 0), 0);
}

export function getSectionScore(section: RubricSection, scores: RubricScores): number {
  const criteria = section.criteria ?? section.subsections?.flatMap((s) => s.criteria) ?? [];
  return criteria.reduce((total, c) => total + (scores[c.id] ?? 0), 0);
}

export function getScoreCategory(totalScore: number): ScoreCategory {
  return SCORE_CATEGORIES.find((cat) => totalScore >= cat.min && totalScore <= cat.max)
    ?? SCORE_CATEGORIES[SCORE_CATEGORIES.length - 1];
}

/** Score ≥ 70 is considered clinically acceptable for audit compatibility. */
export function isScoreAcceptable(totalScore: number): boolean {
  return totalScore >= 70;
}
