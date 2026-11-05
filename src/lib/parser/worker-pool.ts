/**
 * Worker Pool & Bounded Concurrency Manager for CSD Telemetry
 * Offloads decoding, parsing, and telemetry indexing to Web Workers
 * with transferable ArrayBuffers, bounded concurrency, and automatic fallback.
 */

import { CSDFile } from '@/types/csd';
import { StationMaster } from '@/types/station-master';
import { decodeCsdBuffer, parseCsdContent } from './csd-parser';
import {
  WorkerParseRequest,
  WorkerFileParsedMessage,
  WorkerBatchCompletedMessage,
  WorkerProgressMessage,
  WorkerErrorMessage,
} from '@/workers/csd-parser.worker';

export interface ParseArchiveProgress {
  processed: number;
  total: number;
  currentFilename: string;
  recordsParsed: number;
  failedCount: number;
  stage: string;
  percentage: number;
}

export interface ParseArchiveResult {
  parsedFiles: CSDFile[];
  parsedFileMap: Map<string, CSDFile>;
  failedFiles: Array<{ id: string; filename: string; error: string }>;
  totalRecords: number;
}

export interface FileToParse {
  id: string;
  fileRef: File;
  filename: string;
  fileSize: number;
}

class CsdWorkerPool {
  private workers: Worker[] = [];
  private activeCount: number = 0;
  private maxWorkers: number = 2;
  private isTerminated: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
      const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
      this.maxWorkers = Math.min(4, Math.max(1, cores - 1));
    }
  }

  private createWorker(): Worker | null {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      return null;
    }
    try {
      return new Worker(new URL('../../workers/csd-parser.worker.ts', import.meta.url), {
        type: 'module',
      });
    } catch (err) {
      console.warn('Could not instantiate CSD Web Worker, using main-thread fallback:', err);
      return null;
    }
  }

  public terminate(): void {
    this.isTerminated = true;
    for (const w of this.workers) {
      try {
        w.terminate();
      } catch {}
    }
    this.workers = [];
    this.activeCount = 0;
  }

  /**
   * Parse a single CSD buffer using a Web Worker with Transferable ArrayBuffer,
   * falling back to main-thread parsing if workers are unavailable.
   */
  public async parseSingle(
    buffer: ArrayBuffer,
    filename: string,
    fileSize: number,
    stationMasterList?: StationMaster[]
  ): Promise<CSDFile> {
    const worker = this.createWorker();

    if (!worker) {
      // Main-thread fallback
      const decoded = decodeCsdBuffer(buffer);
      const stationMap = stationMasterList
        ? new Map(stationMasterList.map((s) => [s.stationId.trim().toUpperCase(), s]))
        : undefined;
      return parseCsdContent(decoded, filename, fileSize, stationMap);
    }

    return new Promise<CSDFile>((resolve, reject) => {
      const requestId = `single-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      const cleanup = () => {
        worker.terminate();
      };

      worker.onmessage = (event: MessageEvent<WorkerFileParsedMessage | WorkerErrorMessage>) => {
        const msg = event.data;
        if (msg.type === 'FILE_PARSED' && msg.id === requestId) {
          cleanup();
          resolve(msg.file);
        } else if (msg.type === 'ERROR' && msg.id === requestId) {
          cleanup();
          reject(new Error(msg.error));
        }
      };

      worker.onerror = (err) => {
        cleanup();
        reject(new Error(err.message || 'Worker parsing error'));
      };

      const req: WorkerParseRequest = {
        id: requestId,
        type: 'PARSE_FILE',
        buffer,
        filename,
        fileSize,
        stationMasterList,
      };

      // Transfer ArrayBuffer for zero-copy high performance
      worker.postMessage(req, [buffer]);
    });
  }

  /**
   * Bounded concurrency batch parsing of multi-year archive files.
   * Processes files in chunks across worker pool or bounded main-thread batches,
   * recovering gracefully from corrupted files without halting the entire job.
   */
  public async parseBatch(
    files: FileToParse[],
    stationMasterList?: StationMaster[],
    onProgress?: (progress: ParseArchiveProgress) => void
  ): Promise<ParseArchiveResult> {
    const total = files.length;
    const parsedFiles: CSDFile[] = [];
    const parsedFileMap = new Map<string, CSDFile>();
    const failedFiles: Array<{ id: string; filename: string; error: string }> = [];
    let totalRecords = 0;
    let processedCount = 0;

    if (total === 0) {
      return { parsedFiles, parsedFileMap, failedFiles, totalRecords: 0 };
    }

    const report = (currentName: string, stage: string) => {
      if (onProgress) {
        onProgress({
          processed: processedCount,
          total,
          currentFilename: currentName,
          recordsParsed: totalRecords,
          failedCount: failedFiles.length,
          stage,
          percentage: total > 0 ? Math.round((processedCount / total) * 100) : 0,
        });
      }
    };

    // Determine chunk size for batching (e.g. 10 files per worker task)
    const chunkSize = Math.max(5, Math.min(25, Math.ceil(total / (this.maxWorkers * 3))));
    const chunks: FileToParse[][] = [];
    for (let i = 0; i < total; i += chunkSize) {
      chunks.push(files.slice(i, i + chunkSize));
    }

    // Station map for fallback
    let fallbackStationMap: Map<string, StationMaster> | undefined;
    if (stationMasterList) {
      fallbackStationMap = new Map(stationMasterList.map((s) => [s.stationId.trim().toUpperCase(), s]));
    }

    // Function to safely read buffer from File handle
    const readFileBuffer = async (file: File): Promise<ArrayBuffer> => {
      if (typeof file.arrayBuffer === 'function') {
        try {
          return await file.arrayBuffer();
        } catch {}
      }
      return new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
        reader.readAsArrayBuffer(file);
      });
    };

    // Process chunk with a single worker or fallback
    const processChunk = async (chunk: FileToParse[]): Promise<void> => {
      const worker = this.createWorker();

      // Read buffers for chunk
      const bufferItems: Array<{ id: string; buffer: ArrayBuffer; filename: string; fileSize: number }> = [];
      const transferables: ArrayBuffer[] = [];

      for (const item of chunk) {
        try {
          const buf = await readFileBuffer(item.fileRef);
          bufferItems.push({
            id: item.id,
            buffer: buf,
            filename: item.filename,
            fileSize: item.fileSize,
          });
          transferables.push(buf);
        } catch (err: unknown) {
          failedFiles.push({
            id: item.id,
            filename: item.filename,
            error: err instanceof Error ? err.message : 'Failed to read file buffer',
          });
          processedCount++;
          report(item.filename, 'Reading buffers');
        }
      }

      if (bufferItems.length === 0) return;

      if (!worker) {
        // Fallback: synchronous parse on main thread with microtask yields
        for (const item of bufferItems) {
          try {
            const decoded = decodeCsdBuffer(item.buffer);
            const parsed = parseCsdContent(decoded, item.filename, item.fileSize, fallbackStationMap);
            parsedFiles.push(parsed);
            parsedFileMap.set(item.id, parsed);
            totalRecords += parsed.records.length;
          } catch (err: unknown) {
            failedFiles.push({
              id: item.id,
              filename: item.filename,
              error: err instanceof Error ? err.message : 'Parse error',
            });
          }
          processedCount++;
          report(item.filename, 'Parsing telemetry');
          await new Promise((r) => setTimeout(r, 0));
        }
        return;
      }

      // Web Worker path
      await new Promise<void>((resolve) => {
        const batchId = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

        worker.onmessage = (
          event: MessageEvent<
            WorkerProgressMessage | WorkerBatchCompletedMessage | WorkerErrorMessage
          >
        ) => {
          const msg = event.data;

          if (msg.type === 'PROGRESS' && msg.batchId === batchId) {
            report(msg.currentFilename, 'Parsing files in worker');
          } else if (msg.type === 'BATCH_COMPLETED' && msg.batchId === batchId) {
            for (const res of msg.results) {
              const original = chunk.find((c) => c.id === res.id);
              if (res.file) {
                parsedFiles.push(res.file);
                parsedFileMap.set(res.id, res.file);
                totalRecords += res.file.records.length;
              } else if (res.error) {
                failedFiles.push({
                  id: res.id,
                  filename: original?.filename || res.id,
                  error: res.error,
                });
              }
              processedCount++;
            }
            report(chunk[chunk.length - 1]?.filename || '', 'Chunk completed');
            worker.terminate();
            resolve();
          } else if (msg.type === 'ERROR') {
            // Whole chunk error
            for (const item of bufferItems) {
              failedFiles.push({
                id: item.id,
                filename: item.filename,
                error: msg.error || 'Worker execution error',
              });
              processedCount++;
            }
            report(chunk[chunk.length - 1]?.filename || '', 'Recovering from error');
            worker.terminate();
            resolve();
          }
        };

        worker.onerror = (err) => {
          for (const item of bufferItems) {
            failedFiles.push({
              id: item.id,
              filename: item.filename,
              error: err.message || 'Worker thread error',
            });
            processedCount++;
          }
          worker.terminate();
          resolve();
        };

        const req: WorkerParseRequest = {
          id: batchId,
          type: 'PARSE_BATCH',
          files: bufferItems,
          stationMasterList,
        };

        worker.postMessage(req, transferables);
      });
    };

    // Bounded concurrency execution across chunks
    let currentIdx = 0;
    const executeQueue = async (): Promise<void> => {
      while (currentIdx < chunks.length) {
        const chunkIndex = currentIdx++;
        await processChunk(chunks[chunkIndex]);
      }
    };

    const activeWorkers = Math.min(this.maxWorkers, chunks.length);
    const workerPromises: Promise<void>[] = [];
    for (let i = 0; i < activeWorkers; i++) {
      workerPromises.push(executeQueue());
    }

    await Promise.all(workerPromises);

    report('Completed', 'Archive indexing complete');

    return {
      parsedFiles,
      parsedFileMap,
      failedFiles,
      totalRecords,
    };
  }
}

// Singleton worker pool instance
export const workerPool = new CsdWorkerPool();

