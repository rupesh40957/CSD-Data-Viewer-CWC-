import { AppStore } from '../use-app-store';
import { DataQualitySummary, FileParsingSummary } from '@/types/csd';

/**
 * Selector for DataQualitySummary
 */
export function selectDataQualitySummary(state: AppStore): DataQualitySummary | null {
  return state.file?.qualitySummary || null;
}

/**
 * Selector for FileParsingSummary
 */
export function selectFileParsingSummary(state: AppStore): FileParsingSummary | null {
  return state.file?.parsingSummary || null;
}
