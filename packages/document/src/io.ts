/**
 * Import/Export Error Handling
 * T-IO-001 through T-IO-006
 */

export class FileSizeLimitError extends Error {
  constructor(
    public readonly size: number,
    public readonly limit: number
  ) {
    super(`File size ${size} exceeds limit of ${limit} bytes`);
    this.name = 'FileSizeLimitError';
  }
}

export class CorruptedFileError extends Error {
  constructor(
    public readonly fileType: string,
    public readonly details?: string
  ) {
    super(`Corrupted ${fileType} file${details ? `: ${details}` : ''}`);
    this.name = 'CorruptedFileError';
  }
}

export class UnsupportedFormatError extends Error {
  constructor(
    public readonly format: string,
    public readonly supportedFormats: string[]
  ) {
    super(`Unsupported format: ${format}. Supported: ${supportedFormats.join(', ')}`);
    this.name = 'UnsupportedFormatError';
  }
}

export class ImportParseError extends Error {
  constructor(
    public readonly fileType: string,
    public readonly line?: number,
    public readonly details?: string
  ) {
    super(
      `Failed to parse ${fileType}${line ? ` at line ${line}` : ''}${details ? `: ${details}` : ''}`
    );
    this.name = 'ImportParseError';
  }
}

export interface ImportProgress {
  phase: 'reading' | 'parsing' | 'building' | 'complete';
  loaded: number;
  total: number;
  message?: string;
}

export type ProgressCallback = (progress: ImportProgress) => void;

export interface ImportOptions {
  maxFileSize?: number;
  onProgress?: ProgressCallback;
  validateSchema?: boolean;
  strictMode?: boolean;
}

export interface ImportResult<T> {
  success: boolean;
  data?: T;
  errors: ImportError[];
  warnings: string[];
  progress: ImportProgress;
}

export type ImportError =
  | { type: 'size'; message: string; size?: number }
  | { type: 'corrupted'; message: string; details?: string }
  | { type: 'unsupported'; message: string; format?: string }
  | { type: 'parse'; message: string; line?: number }
  | { type: 'io'; message: string };

export const SUPPORTED_IMPORT_FORMATS = [
  'opencad',
  'ifc',
  'ifcxml',
  'dxf',
  'dwg',
  'skp',
  'pdf',
  'rvt',
  'pln',
] as const;

export const SUPPORTED_EXPORT_FORMATS = ['opencad', 'ifc', 'dxf', 'dwg', 'pdf', 'json'] as const;

export type SupportedImportFormat = (typeof SUPPORTED_IMPORT_FORMATS)[number];
export type SupportedExportFormat = (typeof SUPPORTED_EXPORT_FORMATS)[number];

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length === 1) return '';
  return parts.pop()!.toLowerCase();
}

export function isFormatSupported(format: string, supportedFormats: readonly string[]): boolean {
  return supportedFormats.includes(format.toLowerCase());
}

export function detectFormat(filename: string): string | null {
  const ext = getFileExtension(filename);
  if (SUPPORTED_IMPORT_FORMATS.includes(ext as SupportedImportFormat)) {
    return ext;
  }
  return null;
}

export function createUnsupportedFormatError(format: string): UnsupportedFormatError {
  return new UnsupportedFormatError(format, [...SUPPORTED_IMPORT_FORMATS]);
}

export function createCorruptedFileError(fileType: string, details?: string): CorruptedFileError {
  return new CorruptedFileError(fileType, details);
}

export async function importWithProgress<T>(
  readStream: () => Promise<string>,
  parse: (content: string) => T,
  options: ImportOptions = {}
): Promise<ImportResult<T>> {
  const errors: ImportError[] = [];
  const warnings: string[] = [];

  const { maxFileSize = 1024 * 1024 * 1024, onProgress } = options;

  const progress: ImportProgress = {
    phase: 'reading',
    loaded: 0,
    total: 0,
  };

  onProgress?.(progress);

  try {
    progress.phase = 'reading';
    onProgress?.(progress);

    const content = await readStream();
    progress.loaded = content.length;
    progress.total = content.length;
    onProgress?.(progress);

    if (maxFileSize && content.length > maxFileSize) {
      errors.push({
        type: 'size',
        message: `File size exceeds ${maxFileSize} byte limit`,
        size: content.length,
      });
      return { success: false, errors, warnings, progress };
    }

    progress.phase = 'parsing';
    onProgress?.(progress);

    let data: T;
    try {
      data = parse(content);
    } catch (e) {
      const error = e as Error;
      errors.push({
        type: 'parse',
        message: error.message,
        line: error.message.includes('line')
          ? parseInt(error.message.match(/line (\d+)/)?.[1] || '0')
          : undefined,
      });
      return { success: false, errors, warnings, progress };
    }

    progress.phase = 'building';
    progress.message = 'Building document model...';
    onProgress?.(progress);

    progress.phase = 'complete';
    progress.loaded = progress.total;
    onProgress?.(progress);

    return { success: true, data, errors, warnings, progress };
  } catch (e) {
    const error = e as Error;
    errors.push({
      type: 'io',
      message: error.message,
    });
    return { success: false, errors, warnings, progress };
  }
}

export interface BatchImportResult {
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    filename: string;
    success: boolean;
    error?: string;
  }>;
}

export async function batchImportFiles<T>(
  files: Array<{ name: string; content: string }>,
  parse: (content: string, filename: string) => T
): Promise<BatchImportResult> {
  const results: BatchImportResult['results'] = [];
  let successful = 0;
  let failed = 0;

  for (const file of files) {
    const format = getFileExtension(file.name);

    if (!isFormatSupported(format, SUPPORTED_IMPORT_FORMATS)) {
      results.push({
        filename: file.name,
        success: false,
        error: `Unsupported format: ${format}`,
      });
      failed++;
      continue;
    }

    try {
      parse(file.content, file.name);
      results.push({ filename: file.name, success: true });
      successful++;
    } catch (e) {
      results.push({
        filename: file.name,
        success: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      });
      failed++;
    }
  }

  return {
    total: files.length,
    successful,
    failed,
    results,
  };
}

export interface ExportOptions {
  format: SupportedExportFormat;
  filename?: string;
  includeMetadata?: boolean;
}

export async function exportDocument<T>(
  document: T,
  options: ExportOptions
): Promise<{ content: string; mimeType: string; extension: string }> {
  const { format } = options;

  if (!isFormatSupported(format, SUPPORTED_EXPORT_FORMATS)) {
    throw createUnsupportedFormatError(format);
  }

  let content: string;
  let mimeType: string;

  switch (format) {
    case 'opencad':
    case 'json':
      content = JSON.stringify(document, null, 2);
      mimeType = 'application/json';
      break;
    case 'ifc':
      content = document as string;
      mimeType = 'application/step';
      break;
    case 'dxf':
      content = document as string;
      mimeType = 'application/dxf';
      break;
    case 'pdf':
      content = document as string;
      mimeType = 'application/pdf';
      break;
    default:
      content = JSON.stringify(document);
      mimeType = 'application/json';
  }

  return {
    content,
    mimeType,
    extension: format,
  };
}

export function validateDocumentStructure(data: unknown): string[] {
  const warnings: string[] = [];

  if (!data || typeof data !== 'object') {
    warnings.push('Document data is not an object');
    return warnings;
  }

  const doc = data as Record<string, unknown>;

  if (!doc.id || typeof doc.id !== 'string') {
    warnings.push('Document missing valid id');
  }

  if (!doc.metadata) {
    warnings.push('Document missing metadata');
  }

  if (!doc.elements || typeof doc.elements !== 'object') {
    warnings.push('Document missing elements object');
  }

  if (!doc.layers || typeof doc.layers !== 'object') {
    warnings.push('Document missing layers object');
  }

  return warnings;
}
