/**
 * Dynamic Multi-Year Date Extraction & Telemetry Archive Indexer
 * 
 * Supports any number of years (1, 2, 3, 5, 10+ years or future ranges)
 * with zero hardcoded dates, zero hardcoded years, and zero fixed durations.
 */

export interface ArchiveFileInfo {
  id: string;
  name: string;
  size: number;
  dateKey: string;      // ISO format: 'YYYY-MM-DD'
  displayDate: string;  // IST standard format: 'DD/MM/YYYY'
  humanDate: string;    // Human-readable format: '29 Sep 2026'
  year: number;
  month: number;        // 1 - 12
  day: number;          // 1 - 31
  fileRef: File;        // Browser File handle for lazy ArrayBuffer loading
  relativePath?: string;
  formattedSize: string;
  timeTag?: string;     // e.g. '05:30' or 'Copy 1' if extracted from filename
}

export interface DynamicArchiveCatalog {
  folderName: string;
  totalFiles: number;
  files: ArchiveFileInfo[];
  // All dynamically detected years, sorted chronologically ascending
  availableYears: number[];
  // Mapping of Year -> Available Month numbers (1-12) with data
  yearMonthsMap: Record<number, number[]>;
  // Mapping of 'YYYY-MM-DD' -> List of ArchiveFileInfo on that date
  dateFileMap: Record<string, ArchiveFileInfo[]>;
  // Sorted list of all unique date keys ('YYYY-MM-DD') that have at least 1 file
  availableDateKeys: string[];
  minDate: string | null;  // Earliest 'YYYY-MM-DD'
  maxDate: string | null;  // Latest 'YYYY-MM-DD'
  earliestYear: number | null;
  latestYear: number | null;
}

/**
 * Format bytes to readable string (e.g. 425 KB, 2.1 MB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Pad number with leading zero
 */
function pad(n: number): string {
  return String(n).padStart(2, '0');
}

const SHORT_MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export function formatHumanDate(year: number, month: number, day: number): string {
  if (!year || !month || !day) return 'Unknown Date';
  const m = SHORT_MONTH_NAMES[month - 1] || pad(month);
  return `${pad(day)} ${m} ${year}`;
}

/**
 * Dynamically extract Year, Month, Day from any .csd filename.
 * Supports:
 * - YYYYMMDD (e.g. '20260929.csd', '20240515 (1).csd', '20231102_0530.csd')
 * - YYYY-MM-DD or YYYY_MM_DD (e.g. '2025-08-14.csd')
 * - DD-MM-YYYY or DD_MM_YYYY (e.g. '29-09-2022.csd')
 * - Filename prefixes (e.g. 'CSD_20210310.csd', 'AWS_20260929.csd')
 * - Fallback to file.lastModified timestamp if no date pattern in filename
 */
export function parseDateFromCsdFilename(
  filename: string,
  lastModifiedMs?: number
): {
  dateKey: string;
  displayDate: string;
  year: number;
  month: number;
  day: number;
  timeTag?: string;
  isValid: boolean;
} {
  const cleanName = filename.trim();

  // Pattern 1: YYYYMMDD with optional timestamp or copy indicator
  // e.g. 20260929.csd, 20240515 (1).csd, 20231102_0530.csd, CSD_20260929.csd
  const p1 = cleanName.match(/(?:^|[^0-9])(19\d{2}|20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])(?:[^0-9]|$)/);
  if (p1) {
    const year = parseInt(p1[1], 10);
    const month = parseInt(p1[2], 10);
    const day = parseInt(p1[3], 10);
    const dateKey = `${year}-${pad(month)}-${pad(day)}`;
    const displayDate = `${pad(day)}/${pad(month)}/${year}`;

    // Extract optional secondary time or copy tag
    let timeTag: string | undefined;
    const copyMatch = cleanName.match(/\((\d+)\)/);
    const hourMatch = cleanName.match(/_(\d{2})(\d{2})/);
    if (copyMatch) {
      timeTag = `Copy #${copyMatch[1]}`;
    } else if (hourMatch) {
      timeTag = `${hourMatch[1]}:${hourMatch[2]}`;
    }

    return { dateKey, displayDate, year, month, day, timeTag, isValid: true };
  }

  // Pattern 2: YYYY-MM-DD or YYYY_MM_DD
  const p2 = cleanName.match(/(?:^|[^0-9])(19\d{2}|20\d{2})[-_](0[1-9]|1[0-2])[-_](0[1-9]|[12]\d|3[01])(?:[^0-9]|$)/);
  if (p2) {
    const year = parseInt(p2[1], 10);
    const month = parseInt(p2[2], 10);
    const day = parseInt(p2[3], 10);
    return {
      dateKey: `${year}-${pad(month)}-${pad(day)}`,
      displayDate: `${pad(day)}/${pad(month)}/${year}`,
      year,
      month,
      day,
      isValid: true,
    };
  }

  // Pattern 3: DD-MM-YYYY or DD_MM_YYYY
  const p3 = cleanName.match(/(?:^|[^0-9])(0[1-9]|[12]\d|3[01])[-_](0[1-9]|1[0-2])[-_](19\d{2}|20\d{2})(?:[^0-9]|$)/);
  if (p3) {
    const day = parseInt(p3[1], 10);
    const month = parseInt(p3[2], 10);
    const year = parseInt(p3[3], 10);
    return {
      dateKey: `${year}-${pad(month)}-${pad(day)}`,
      displayDate: `${pad(day)}/${pad(month)}/${year}`,
      year,
      month,
      day,
      isValid: true,
    };
  }

  // Fallback: Use file's last modified date if available
  if (lastModifiedMs && !isNaN(lastModifiedMs) && lastModifiedMs > 0) {
    const d = new Date(lastModifiedMs);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return {
      dateKey: `${year}-${pad(month)}-${pad(day)}`,
      displayDate: `${pad(day)}/${pad(month)}/${year}`,
      year,
      month,
      day,
      timeTag: 'Date by file timestamp',
      isValid: true,
    };
  }

  // Unknown / unparsed date fallback
  return {
    dateKey: 'unknown-date',
    displayDate: 'Unknown Date',
    year: 0,
    month: 0,
    day: 0,
    isValid: false,
  };
}

/**
 * Scan a list of File objects (from folder picker or input),
 * dynamically index them by year/month/date, and construct the DynamicArchiveCatalog.
 * 
 * Works for any duration: 1 month, 1 year, 2 years, 5 years, 10+ years.
 */
export function buildDynamicArchiveCatalog(
  files: File[],
  folderName: string = 'Telemetry Archive'
): DynamicArchiveCatalog {
  const csdFiles: File[] = [];

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const lower = f.name.toLowerCase();
    if (lower.endsWith('.csd') || lower.endsWith('.txt')) {
      csdFiles.push(f);
    }
  }

  const dateFileMap: Record<string, ArchiveFileInfo[]> = {};
  const yearSet = new Set<number>();
  const yearMonthsMap: Record<number, Set<number>> = {};
  const allFiles: ArchiveFileInfo[] = [];

  csdFiles.forEach((file, index) => {
    const parsed = parseDateFromCsdFilename(file.name, file.lastModified);
    const fileInfo: ArchiveFileInfo = {
      id: `arch-${index}-${file.name}`,
      name: file.name,
      size: file.size,
      dateKey: parsed.dateKey,
      displayDate: parsed.displayDate,
      humanDate: formatHumanDate(parsed.year, parsed.month, parsed.day),
      year: parsed.year,
      month: parsed.month,
      day: parsed.day,
      fileRef: file,
      relativePath: file.webkitRelativePath || file.name,
      formattedSize: formatFileSize(file.size),
      timeTag: parsed.timeTag,
    };

    allFiles.push(fileInfo);

    if (!dateFileMap[parsed.dateKey]) {
      dateFileMap[parsed.dateKey] = [];
    }
    dateFileMap[parsed.dateKey].push(fileInfo);

    if (parsed.isValid && parsed.year > 0) {
      yearSet.add(parsed.year);
      if (!yearMonthsMap[parsed.year]) {
        yearMonthsMap[parsed.year] = new Set<number>();
      }
      yearMonthsMap[parsed.year].add(parsed.month);
    }
  });

  // Sort available years chronologically ascending (e.g. [2021, 2022, 2023, 2024, 2025, 2026])
  const availableYears = Array.from(yearSet).sort((a, b) => a - b);

  // Convert Set of months to sorted arrays for each year
  const normalizedYearMonthsMap: Record<number, number[]> = {};
  availableYears.forEach((yr) => {
    normalizedYearMonthsMap[yr] = Array.from(yearMonthsMap[yr] || []).sort((a, b) => a - b);
  });

  // Sort unique valid date keys chronologically
  const availableDateKeys = Object.keys(dateFileMap)
    .filter((k) => k !== 'unknown-date')
    .sort();

  const minDate = availableDateKeys.length > 0 ? availableDateKeys[0] : null;
  const maxDate = availableDateKeys.length > 0 ? availableDateKeys[availableDateKeys.length - 1] : null;

  // Sort all files latest date first
  allFiles.sort((a, b) => b.dateKey.localeCompare(a.dateKey));

  return {
    folderName,
    totalFiles: csdFiles.length,
    files: allFiles,
    availableYears,
    yearMonthsMap: normalizedYearMonthsMap,
    dateFileMap,
    availableDateKeys,
    minDate,
    maxDate,
    earliestYear: availableYears.length > 0 ? availableYears[0] : null,
    latestYear: availableYears.length > 0 ? availableYears[availableYears.length - 1] : null,
  };
}
