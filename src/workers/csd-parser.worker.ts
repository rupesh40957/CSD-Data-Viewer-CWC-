import { decodeCsdBuffer, parseCsdContent } from '@/lib/parser/csd-parser';
import { StationMaster } from '@/types/station-master';
import { CSDFile } from '@/types/csd';

export interface WorkerParseRequest {
  id: string;
  type: 'PARSE_FILE' | 'PARSE_BATCH';
  buffer?: ArrayBuffer;
  filename?: string;
  fileSize?: number;
  files?: Array<{ id: string; buffer: ArrayBuffer; filename: string; fileSize: number }>;
  stationMasterList?: StationMaster[];
}

export interface WorkerProgressMessage {
  type: 'PROGRESS';
  batchId: string;
  processed: number;
  total: number;
  currentFilename: string;
  recordsParsed: number;
  failedCount: number;
}

export interface WorkerFileParsedMessage {
  type: 'FILE_PARSED';
  id: string;
  file: CSDFile;
}

export interface WorkerBatchCompletedMessage {
  type: 'BATCH_COMPLETED';
  batchId: string;
  results: Array<{ id: string; file?: CSDFile; error?: string }>;
  totalRecords: number;
}

export interface WorkerErrorMessage {
  type: 'ERROR';
  id?: string;
  error: string;
}

// Cached station lookup inside worker
let stationLookupCache: Map<string, StationMaster> | null = null;

function getStationLookup(list?: StationMaster[]): Map<string, StationMaster> | undefined {
  if (list && list.length > 0) {
    const map = new Map<string, StationMaster>();
    for (let i = 0; i < list.length; i++) {
      const st = list[i];
      if (st.stationId) {
        map.set(st.stationId.trim().toUpperCase(), st);
      }
    }
    stationLookupCache = map;
    return map;
  }
  return stationLookupCache || undefined;
}

self.onmessage = (event: MessageEvent<WorkerParseRequest>) => {
  const req = event.data;

  try {
    const stationLookup = getStationLookup(req.stationMasterList);

    if (req.type === 'PARSE_FILE') {
      if (!req.buffer) throw new Error('Missing file buffer');
      const filename = req.filename || 'unknown.csd';
      const fileSize = req.fileSize || req.buffer.byteLength;

      const decoded = decodeCsdBuffer(req.buffer);
      const parsed = parseCsdContent(decoded, filename, fileSize, stationLookup);

      const response: WorkerFileParsedMessage = {
        type: 'FILE_PARSED',
        id: req.id,
        file: parsed,
      };
      self.postMessage(response);
    } else if (req.type === 'PARSE_BATCH') {
      const items = req.files || [];
      const total = items.length;
      const results: Array<{ id: string; file?: CSDFile; error?: string }> = [];
      let totalRecords = 0;
      let failedCount = 0;

      for (let i = 0; i < total; i++) {
        const item = items[i];
        try {
          const decoded = decodeCsdBuffer(item.buffer);
          const parsed = parseCsdContent(decoded, item.filename, item.fileSize, stationLookup);
          results.push({ id: item.id, file: parsed });
          totalRecords += parsed.records.length;
        } catch (err: unknown) {
          failedCount++;
          const msg = err instanceof Error ? err.message : String(err);
          results.push({ id: item.id, error: msg });
        }

        // Post progress every file or in small chunks
        const progressMsg: WorkerProgressMessage = {
          type: 'PROGRESS',
          batchId: req.id,
          processed: i + 1,
          total,
          currentFilename: item.filename,
          recordsParsed: totalRecords,
          failedCount,
        };
        self.postMessage(progressMsg);
      }

      const completedMsg: WorkerBatchCompletedMessage = {
        type: 'BATCH_COMPLETED',
        batchId: req.id,
        results,
        totalRecords,
      };
      self.postMessage(completedMsg);
    }
  } catch (err: unknown) {
    const errorMsg: WorkerErrorMessage = {
      type: 'ERROR',
      id: req.id,
      error: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(errorMsg);
  }
};

export {};
