import {
  CSDFile,
  CSDRecord,
  FileStats,
  ParseError,
  StationSummary,
  FileParsingSummary,
  DataQualitySummary,
} from '@/types/csd';
import { StationMaster } from '@/types/station-master';
import { ArchiveFileInfo, DynamicArchiveCatalog } from './date-extractor';
import { decodeCsdBuffer, parseCsdContent } from './csd-parser';

export interface ArchiveSpanSummary {
  title: string;
  details: string;
  yearsCount: number;
  monthsCount: number;
  daysCount: number;
  filesCount: number;
  startDateFormatted: string;
  endDateFormatted: string;
  yearsList: number[];
}

/**
 * Computes a human-readable summary of the full span of years, months, and dates
 * loaded in a Multi-Year Archive Catalog.
 */
export function computeArchiveSpanSummary(
  catalog: DynamicArchiveCatalog | null
): ArchiveSpanSummary {
  if (!catalog || catalog.totalFiles === 0) {
    return {
      title: 'No Archive Loaded',
      details: '0 files loaded',
      yearsCount: 0,
      monthsCount: 0,
      daysCount: 0,
      filesCount: 0,
      startDateFormatted: '--',
      endDateFormatted: '--',
      yearsList: [],
    };
  }

  const yearsList = catalog.availableYears || [];
  const yearsCount = yearsList.length;

  let totalMonthsCount = 0;
  Object.values(catalog.yearMonthsMap || {}).forEach((months) => {
    totalMonthsCount += months.length;
  });

  const daysCount = catalog.availableDateKeys?.length || 0;
  const filesCount = catalog.totalFiles;

  const formatDateStr = (iso: string | null) => {
    if (!iso) return '--';
    const parts = iso.split('-');
    if (parts.length !== 3) return iso;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mIdx = parseInt(parts[1], 10) - 1;
    const mStr = months[mIdx] || parts[1];
    return `${parts[2]}-${mStr}-${parts[0]}`;
  };

  const startDateFormatted = formatDateStr(catalog.minDate);
  const endDateFormatted = formatDateStr(catalog.maxDate);

  let title = '';
  if (yearsCount > 1) {
    title = `Span: ${yearsCount} Years (${yearsList[0]} - ${yearsList[yearsList.length - 1]}), ${totalMonthsCount} Months`;
  } else if (yearsCount === 1) {
    title = `Span: ${yearsList[0]} (${totalMonthsCount} Month${totalMonthsCount > 1 ? 's' : ''})`;
  } else {
    title = `Span: ${filesCount} Telemetry Files`;
  }

  const details = `${startDateFormatted} → ${endDateFormatted} • ${daysCount} Days across ${filesCount} Files`;

  return {
    title,
    details,
    yearsCount,
    monthsCount: totalMonthsCount,
    daysCount,
    filesCount,
    startDateFormatted,
    endDateFormatted,
    yearsList,
  };
}

/**
 * Merges an array of parsed CSDFile objects into a single unified CSDFile.
 * Deduplicates overlapping boundary records, recalculates station statistics,
 * aggregates quality and protocol metrics, and sets full time span.
 */
export function mergeParsedCsdFiles(
  parsedFiles: CSDFile[],
  folderName: string = 'Multi-Year Archive',
  stationLookup?: Map<string, StationMaster>
): CSDFile {
  if (parsedFiles.length === 0) {
    throw new Error('Cannot aggregate an empty file list');
  }

  if (parsedFiles.length === 1) {
    return parsedFiles[0];
  }

  let totalBytes = 0;
  let totalLines = 0;
  const allRecords: CSDRecord[] = [];
  const allErrors: ParseError[] = [];
  let goodCount = 0;
  let badCount = 0;
  let corruptFieldCount = 0;
  const statusCounts = { L: 0, U: 0, $: 0 };
  const hCounts: Map<string, number> = new Map();
  const stationRecordMap: Map<string, CSDRecord[]> = new Map();

  for (const pf of parsedFiles) {
    totalBytes += pf.fileSize || 0;
    totalLines += pf.parsingSummary?.totalLines || pf.records.length;
    goodCount += pf.stats?.goodRecords || 0;
    badCount += pf.stats?.badRecords || 0;
    corruptFieldCount += pf.stats?.corruptedFieldsRecords || 0;
    statusCounts.L += pf.stats?.statusBreakdown?.L || 0;
    statusCounts.U += pf.stats?.statusBreakdown?.U || 0;
    statusCounts.$ += pf.stats?.statusBreakdown?.$ || 0;

    if (pf.stats?.hValues) {
      for (const h of pf.stats.hValues) {
        hCounts.set(h.code, (hCounts.get(h.code) || 0) + h.count);
      }
    }

    for (const r of pf.records) {
      allRecords.push(r);
      const stId = (r.stationId || '').trim().toUpperCase();
      if (!stationRecordMap.has(stId)) {
        stationRecordMap.set(stId, []);
      }
      stationRecordMap.get(stId)!.push(r);
    }

    if (pf.errors && pf.errors.length > 0) {
      allErrors.push(...pf.errors.slice(0, 10));
    }
  }

  // Sort all records chronologically
  allRecords.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Deduplicate records that have identical stationId + timestamp
  const dedupedRecords: CSDRecord[] = [];
  const seenKey = new Set<string>();
  for (const r of allRecords) {
    const key = `${r.stationId}_${r.timestamp.getTime()}`;
    if (!seenKey.has(key)) {
      seenKey.add(key);
      dedupedRecords.push(r);
    }
  }

  // Build aggregated station summaries
  const stations: StationSummary[] = Array.from(stationRecordMap.entries()).map(([stationId, stRecords]) => {
    let stGood = 0;
    let stBad = 0;
    let stLocked = 0;
    let stUnlocked = 0;
    let stCorrupt = 0;
    const sensorSet = new Set<string>();

    for (const r of stRecords) {
      if (r.quality === 'Good') stGood++;
      else stBad++;

      if (r.status === 'L') stLocked++;
      else if (r.status === 'U') stUnlocked++;
      else stCorrupt++;

      if (r.sensors) {
        r.sensors.forEach((s) => sensorSet.add(s.key));
      }
    }

    const sortedSt = [...stRecords].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const firstSeen = sortedSt[0]?.timestamp || new Date(0);
    const lastSeen = sortedSt[sortedSt.length - 1]?.timestamp || new Date(0);

    const normId = stationId.trim().toUpperCase();
    const stationMeta = stationLookup ? stationLookup.get(normId) : undefined;
    const stationName = stationMeta ? stationMeta.stationName : null;

    return {
      stationId,
      stationName,
      stationMetadata: stationMeta,
      isMapped: !!stationMeta,
      totalRecords: stRecords.length,
      goodRecords: stGood,
      badRecords: stBad,
      lockedCount: stLocked,
      unlockedCount: stUnlocked,
      corruptCount: stCorrupt,
      firstSeen,
      lastSeen,
      activeSensors: Array.from(sensorSet).sort(),
    };
  });

  stations.sort((a, b) => b.totalRecords - a.totalRecords);

  const topStations = stations.slice(0, 10).map((s) => ({
    stationId: s.stationId,
    count: s.totalRecords,
  }));

  const hValues = Array.from(hCounts.entries())
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count);

  const startTime = dedupedRecords.length > 0 ? dedupedRecords[0].timestamp : null;
  const endTime = dedupedRecords.length > 0 ? dedupedRecords[dedupedRecords.length - 1].timestamp : null;

  const totalRecords = dedupedRecords.length;
  const recalculatedGood = dedupedRecords.filter((r) => r.quality === 'Good').length;
  const recalculatedBad = totalRecords - recalculatedGood;

  const stats: FileStats = {
    filename: `${folderName} (${parsedFiles.length} files aggregated)`,
    fileSize: totalBytes,
    totalRecords,
    goodRecords: recalculatedGood,
    badRecords: recalculatedBad,
    corruptedFieldsRecords: corruptFieldCount,
    uniqueStations: stations.length,
    startTime,
    endTime,
    statusBreakdown: statusCounts,
    qualityBreakdown: { Good: recalculatedGood, Bad: recalculatedBad },
    topStations,
    hValues,
  };

  const goodPct = totalRecords > 0 ? (recalculatedGood / totalRecords) * 100 : 100;
  const badPct = totalRecords > 0 ? (recalculatedBad / totalRecords) * 100 : 0;

  const qualitySummary: DataQualitySummary = {
    totalRecords,
    goodRecords: recalculatedGood,
    badRecords: recalculatedBad,
    goodPercentage: goodPct,
    badPercentage: badPct,
    lockedCount: statusCounts.L,
    unlockedCount: statusCounts.U,
    corruptStatusCount: statusCounts.$,
    recordsWithCorruptMarkers: corruptFieldCount,
    stationBreakdown: {},
  };

  const parsingSummary: FileParsingSummary = {
    filename: `${folderName} (${parsedFiles.length} files aggregated)`,
    fileSizeBytes: totalBytes,
    totalLines,
    validRecords: totalRecords,
    malformedRecords: allErrors.length,
    parseTimeMs: 0,
    lineEnding: 'CRLF',
    fieldDelimiter: '¸ (0xB8)',
    recordPrefix: '» (0xBB)',
    detectedEncoding: 'windows-1252',
  };

  return {
    filename: `${folderName} (${parsedFiles.length} files)`,
    fileSize: totalBytes,
    parseDate: new Date(),
    records: dedupedRecords,
    stations,
    stats,
    errors: allErrors,
    parsingSummary,
    qualitySummary,
  };
}

/**
 * Reads array buffer from File handle safely across modern browsers.
 */
async function readFileBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') {
    try {
      return await file.arrayBuffer();
    } catch {
      // Fallback to FileReader below
    }
  }
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parses and aggregates multiple archive files with smooth progress notifications.
 */
export async function aggregateArchiveFiles(
  files: ArchiveFileInfo[],
  folderName: string = 'CSD Multi-Year Archive',
  stationLookup?: Map<string, StationMaster>,
  onProgress?: (processed: number, total: number, currentFileName: string) => void
): Promise<{ mergedFile: CSDFile; parsedFileMap: Map<string, CSDFile> }> {
  const parsedFiles: CSDFile[] = [];
  const parsedFileMap = new Map<string, CSDFile>();
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const fInfo = files[i];
    if (onProgress) {
      onProgress(i + 1, total, fInfo.name);
    }

    try {
      const buffer = await readFileBuffer(fInfo.fileRef);
      const decoded = decodeCsdBuffer(buffer);
      const parsed = parseCsdContent(decoded, fInfo.name, fInfo.size, stationLookup);
      parsedFiles.push(parsed);
      parsedFileMap.set(fInfo.id, parsed);
    } catch (err) {
      console.warn(`Failed to parse archive file ${fInfo.name}:`, err);
    }

    // Yield control to let React render progress on screen every 3 files
    if (i % 3 === 0 || i === total - 1) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  if (parsedFiles.length === 0) {
    throw new Error('No valid telemetry files could be parsed in the selected folder.');
  }

  const mergedFile = mergeParsedCsdFiles(parsedFiles, folderName, stationLookup);
  return { mergedFile, parsedFileMap };
}

