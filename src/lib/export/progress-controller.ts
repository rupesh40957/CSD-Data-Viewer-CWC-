/**
 * Monotonic Multi-Stage Export Progress Controller
 * Ensures:
 * 1. Progress percentage NEVER decreases (strictly monotonic 0% -> 100%)
 * 2. Item counters NEVER reset backwards within the same phase/job
 * 3. 8 distinct clearly defined stages with weighted progress calculation based on real work
 * 4. Responsive cancellation support via AbortController
 */

export type ExportStage =
  | 'PREPARING'
  | 'READING_ARCHIVE'
  | 'FILTERING'
  | 'BUILDING_STRUCTURE'
  | 'FORMATTING'
  | 'GENERATING_FILE'
  | 'PREPARING_DOWNLOAD'
  | 'COMPLETED';

export interface StageDefinition {
  number: number;
  name: string;
  minPct: number;
  maxPct: number;
}

export const EXPORT_STAGES_INFO: Record<ExportStage, StageDefinition> = {
  PREPARING: { number: 1, name: 'Preparing export data', minPct: 0, maxPct: 5 },
  READING_ARCHIVE: { number: 2, name: 'Reading selected archive data', minPct: 5, maxPct: 30 },
  FILTERING: { number: 3, name: 'Filtering and validating telemetry records', minPct: 30, maxPct: 38 },
  BUILDING_STRUCTURE: { number: 4, name: 'Building CWC matrix structure', minPct: 38, maxPct: 50 },
  FORMATTING: { number: 5, name: 'Applying Excel formatting', minPct: 50, maxPct: 85 },
  GENERATING_FILE: { number: 6, name: 'Generating final file buffer', minPct: 85, maxPct: 95 },
  PREPARING_DOWNLOAD: { number: 7, name: 'Preparing download', minPct: 95, maxPct: 99 },
  COMPLETED: { number: 8, name: 'Export completed', minPct: 100, maxPct: 100 },
};

export interface ExportProgressState {
  stage: ExportStage;
  stageNumber: number;
  stageName: string;
  processed: number;
  total: number;
  percentage: number;
  detail: string;
  isIndeterminate?: boolean;
}

export class ExportProgressController {
  public readonly jobId: number;
  private abortController: AbortController;
  private currentStage: ExportStage = 'PREPARING';
  private highestPercentage: number = 0;
  private onUpdate?: (state: ExportProgressState) => void;
  private lastProcessedCounter: Record<string, number> = {};

  constructor(jobId: number, onUpdate?: (state: ExportProgressState) => void) {
    this.jobId = jobId;
    this.abortController = new AbortController();
    this.onUpdate = onUpdate;
  }

  public get signal(): AbortSignal {
    return this.abortController.signal;
  }

  public get isAborted(): boolean {
    return this.abortController.signal.aborted;
  }

  public cancel(): void {
    this.abortController.abort();
  }

  public checkAborted(): void {
    if (this.isAborted) {
      const err = new Error('Export job cancelled by user.');
      err.name = 'AbortError';
      throw err;
    }
  }

  /**
   * Post a progress update from actual completed work.
   * Percentage is calculated from real stage weights and is guaranteed to be strictly monotonic.
   */
  public update(
    stage: ExportStage,
    processed: number,
    total: number,
    detail?: string,
    overrideStageName?: string
  ): void {
    this.checkAborted();

    const info = EXPORT_STAGES_INFO[stage];
    this.currentStage = stage;

    // Calculate stage-weighted percentage from actual work
    let calculatedPct = info.minPct;
    if (total > 0) {
      const clampedProcessed = Math.min(processed, total);
      const ratio = clampedProcessed / total;
      calculatedPct = info.minPct + Math.round(ratio * (info.maxPct - info.minPct));
    } else {
      calculatedPct = info.minPct;
    }

    // STRICT MONOTONIC GUARANTEE: percentage can NEVER decrease
    this.highestPercentage = Math.max(this.highestPercentage, calculatedPct);

    // STRICT MONOTONIC GUARANTEE FOR COUNTER within the same stage
    const stageKey = `${stage}_${total}`;
    const prevProcessed = this.lastProcessedCounter[stageKey] || 0;
    const monotonicProcessed = Math.max(prevProcessed, processed);
    this.lastProcessedCounter[stageKey] = monotonicProcessed;

    if (this.onUpdate) {
      this.onUpdate({
        stage,
        stageNumber: info.number,
        stageName: overrideStageName || info.name,
        processed: monotonicProcessed,
        total,
        percentage: this.highestPercentage,
        detail: detail || (total > 0 ? `${monotonicProcessed.toLocaleString()} / ${total.toLocaleString()}` : ''),
        isIndeterminate: total <= 0,
      });
    }
  }
}

