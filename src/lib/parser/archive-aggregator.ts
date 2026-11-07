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
import { workerPool, ParseArchiveProgress } from './worker-pool';
import { isValidStationId, sanitizeStationId } from './csd-parser';

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
      const rawId = sanitizeStationId(r.stationId || '');
      if (!isValidStationId(rawId)) {
        // Group all corrupt frame noise tokens under a single CORRUPT_FRAME bucket
        const corruptKey = 'CORRUPT_FRAME';
        if (!stationRecordMap.has(corruptKey)) {
          stationRecordMap.set(corruptKey, []);
        }
        stationRecordMap.get(corruptKey)!.push(r);
        continue;
      }
      const stId = /^[0-9A-Fa-f]{8}$/.test(rawId) ? rawId.toUpperCase() : rawId;
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

  // Build aggregated station summaries in a single pass without redundant array clones or sorting
  const stations: StationSummary[] = Array.from(stationRecordMap.entries()).map(([stationId, stRecords]) => {
    let stGood = 0;
    let stBad = 0;
    let stLocked = 0;
    let stUnlocked = 0;
    let stCorrupt = 0;
    let firstSeen: Date | null = null;
    let lastSeen: Date | null = null;
    const sensorSet = new Set<string>();

    for (let i = 0; i < stRecords.length; i++) {
      const r = stRecords[i];
      if (r.quality === 'Good') stGood++;
      else stBad++;

      if (r.status === 'L') stLocked++;
      else if (r.status === 'U') stUnlocked++;
      else stCorrupt++;

      if (r.sensors) {
        for (let s = 0; s < r.sensors.length; s++) {
          sensorSet.add(r.sensors[s].key);
        }
      }

      if (!firstSeen || r.timestamp < firstSeen) firstSeen = r.timestamp;
      if (!lastSeen || r.timestamp > lastSeen) lastSeen = r.timestamp;
    }

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
      firstSeen: firstSeen || new Date(0),
      lastSeen: lastSeen || new Date(0),
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
    uniqueStations: stations.filter(
      (s) =>
        Boolean(s.stationMetadata) ||
        (s.stationName && s.stationName !== s.stationId) ||
        (/^[0-9A-Fa-f]{8}$/.test(s.stationId) && (s.totalRecords >= 5 || stations.length <= 850))
    ).length,
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
 * Parses and aggregates multiple archive files using the high-performance Web Worker pool
 * with bounded concurrency, smooth progress tracking, and error recovery.
 */
export async function aggregateArchiveFiles(
  files: ArchiveFileInfo[],
  folderName: string = 'CSD Multi-Year Archive',
  stationLookup?: Map<string, StationMaster>,
  onProgress?: (progress: ParseArchiveProgress) => void
): Promise<{
  mergedFile: CSDFile;
  parsedFileMap: Map<string, CSDFile>;
  failedFiles: Array<{ id: string; filename: string; error: string }>;
}> {
  if (files.length === 0) {
    throw new Error('No files provided to aggregate');
  }

  const stationMasterList = stationLookup ? Array.from(stationLookup.values()) : undefined;

  const toParse = files.map((f) => ({
    id: f.id,
    fileRef: f.fileRef,
    filename: f.name,
    fileSize: f.size,
  }));

  const { parsedFiles, parsedFileMap, failedFiles } = await workerPool.parseBatch(
    toParse,
    stationMasterList,
    onProgress
  );

  if (parsedFiles.length === 0) {
    throw new Error(
      `No valid telemetry files could be parsed (${failedFiles.length} files failed).`
    );
  }

  const mergedFile = mergeParsedCsdFiles(parsedFiles, folderName, stationLookup);
  return { mergedFile, parsedFileMap, failedFiles };
}
