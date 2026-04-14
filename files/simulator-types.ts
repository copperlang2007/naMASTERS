// ── TRAINING SIMULATOR TYPES ─────────────────────────────────────────────────
// Drop this file into your types or lib folder

export type SimulatorState = 'pre-call' | 'active' | 'scoring' | 'debrief';

export interface TranscriptSegment {
  speaker: 'caller' | 'agent';
  text: string;
  timestamp: number;
  isFinal: boolean;
}

export interface DiscoveryChecklist {
  name: boolean;
  dob: boolean;
  address: boolean;
  phone: boolean;
  medicare_id: boolean;
  current_plan: boolean;
  doctors: boolean;
  medications: boolean;
  pharmacy: boolean;
  reason_for_call: boolean;
  priority_2_copays: boolean;
  priority_3_dental: boolean;
  lis_status: boolean;
}

export interface DimensionScore {
  score: number;
  what_agent_did: string;
  what_was_missed: string;
  perfect_response: string;
}

export interface CallScore {
  discovery_identity: DimensionScore;
  discovery_situation: DimensionScore;
  needs_identification: DimensionScore;
  product_knowledge: DimensionScore;
  compliance: DimensionScore;
  communication_quality: DimensionScore;
  resolution: DimensionScore;
  overall_score: number;
  top_strength: string;
  top_improvement: string;
  compliance_flags: string[];
  discovery_checklist: DiscoveryChecklist;
}

export const DOROTHY_GROUND_TRUTH = {
  name: 'Dorothy Miller',
  dob: 'September 4, 1952',
  age: 72,
  address: '847 Willow Creek Drive, Anna, TX 75409',
  phone: '(469) 555-0317',
  medicare_id: '2HJ7-RF4-NP61',
  current_plan: 'UHC Medicare Advantage — Plan ID UHC-MA-TX-0047',
  pcp: 'Dr. Robert Chen — North Texas Family Clinic, Anna TX',
  cardiologist: 'Dr. Linda Okafor — Plano TX (seen once, last year)',
  medications: 'Lisinopril 10mg once daily · Metformin 500mg twice daily (only these two)',
  reason_for_call: 'Saw ~$900 grocery benefit card online, wants to know if it\'s real and if her plan has it',
  priority_1: 'Grocery / food benefit card',
  priority_2: 'Lower Rx copays — Metformin feels expensive',
  priority_3: 'Dental coverage — hasn\'t been to dentist in 2 years',
  pharmacy: 'CVS in Anna TX (possibly Walgreens — she was vague)',
  lis: 'No',
} as const;

export const CHECKLIST_LABELS: Record<keyof DiscoveryChecklist, string> = {
  name: "Caller's full name",
  dob: 'Date of birth / age',
  address: 'Home address',
  phone: 'Phone number',
  medicare_id: 'Medicare ID number',
  current_plan: 'Current insurance plan',
  doctors: 'Current doctors',
  medications: 'Current medications',
  pharmacy: 'Preferred pharmacy',
  reason_for_call: 'Primary reason for calling',
  priority_2_copays: 'Rx copay concern (secondary need)',
  priority_3_dental: 'Dental coverage gap (tertiary need)',
  lis_status: 'LIS / Extra Help status',
};

export const DIMENSION_LABELS: Record<keyof Omit<CallScore,
  'overall_score' | 'top_strength' | 'top_improvement' | 'compliance_flags' | 'discovery_checklist'
>, { label: string; weight: string }> = {
  discovery_identity:    { label: 'Identity Discovery',      weight: '15%' },
  discovery_situation:   { label: 'Situation Analysis',      weight: '15%' },
  needs_identification:  { label: 'Needs Identification',    weight: '25%' },
  product_knowledge:     { label: 'Product Knowledge',       weight: '10%' },
  compliance:            { label: 'Compliance',              weight: '20%' },
  communication_quality: { label: 'Communication Quality',   weight: '10%' },
  resolution:            { label: 'Resolution & Next Steps', weight: '5%'  },
};
