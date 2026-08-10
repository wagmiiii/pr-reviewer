export interface Evidence {
  readonly file: string;
  readonly line: number;
}

export interface JudgmentResult {
  readonly verdict: string | 'unknown';
  readonly confidence: number;
  readonly evidence: readonly Evidence[];
  readonly note: string;
}

export interface ReviewerEffortEstimate extends JudgmentResult {
  readonly estimatedMinutes: number;
  readonly whatToLookAtFirst: string;
}

export interface JudgeConfig {
  /**
   * If true, judgments are run in shadow mode and marked unvalidated.
   */
  readonly shadow?: boolean;
}
