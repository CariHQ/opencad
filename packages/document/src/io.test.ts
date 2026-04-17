/**
 * IO Error Handling Tests
 * T-IO-001: File size limit error
 * T-IO-002: Corrupted file error
 * T-IO-003: Unsupported format error
 * T-IO-004: Import parse error
 * T-IO-005: Import with progress
 * T-IO-006: Batch import
 */
import { describe, it, expect, vi } from 'vitest';
import {
  FileSizeLimitError,
  CorruptedFileError,
  UnsupportedFormatError,
  ImportParseError,
  getFileExtension,
  isFormatSupported,
  detectFormat,
  createUnsupportedFormatError,
  createCorruptedFileError,
  importWithProgress,
  batchImportFiles,
  exportDocument,
  validateDocumentStructure,
  SUPPORTED_IMPORT_FORMATS,
  SUPPORTED_EXPORT_FORMATS,
} from './io';

describe('T-IO-001: FileSizeLimitError', () => {
  it('has correct name', () => {
    const err = new FileSizeLimitError(2048, 1024);
    expect(err.name).toBe('FileSizeLimitError');
  });

  it('stores size and limit', () => {
    const err = new FileSizeLimitError(5000, 1000);
    expect(err.size).toBe(5000);
    expect(err.limit).toBe(1000);
  });

  it('message includes size and limit', () => {
    const err = new FileSizeLimitError(5000, 1000);
    expect(err.message).toContain('5000');
    expect(err.message).toContain('1000');
  });

  it('is an instance of Error', () => {
    expect(new FileSizeLimitError(1, 2)).toBeInstanceOf(Error);
  });
});

describe('T-IO-002: CorruptedFileError', () => {
  it('has correct name', () => {
    const err = new CorruptedFileError('ifc');
    expect(err.name).toBe('CorruptedFileError');
  });

  it('includes fileType in message', () => {
    const err = new CorruptedFileError('dxf');
    expect(err.message).toContain('dxf');
  });

  it('includes details when provided', () => {
    const err = new CorruptedFileError('ifc', 'invalid header');
    expect(err.message).toContain('invalid header');
  });

  it('works without details', () => {
    const err = new CorruptedFileError('pdf');
    expect(err.message).not.toContain('undefined');
  });
});

describe('T-IO-003: UnsupportedFormatError', () => {
  it('has correct name', () => {
    const err = new UnsupportedFormatError('xyz', ['ifc', 'dxf']);
    expect(err.name).toBe('UnsupportedFormatError');
  });

  it('includes format in message', () => {
    const err = new UnsupportedFormatError('xyz', ['ifc', 'dxf']);
    expect(err.message).toContain('xyz');
  });

  it('includes supported formats in message', () => {
    const err = new UnsupportedFormatError('xyz', ['ifc', 'dxf']);
    expect(err.message).toContain('ifc');
    expect(err.message).toContain('dxf');
  });
});

describe('T-IO-004: ImportParseError', () => {
  it('has correct name', () => {
    const err = new ImportParseError('dxf');
    expect(err.name).toBe('ImportParseError');
  });

  it('includes fileType in message', () => {
    const err = new ImportParseError('skp');
    expect(err.message).toContain('skp');
  });

  it('includes line number when provided', () => {
    const err = new ImportParseError('dxf', 42);
    expect(err.message).toContain('42');
  });

  it('includes details when provided', () => {
    const err = new ImportParseError('dxf', 10, 'unexpected token');
    expect(err.message).toContain('unexpected token');
  });
});

describe('T-IO-005: IO utility functions', () => {
  it('getFileExtension returns lowercase extension', () => {
    expect(getFileExtension('model.IFC')).toBe('ifc');
    expect(getFileExtension('drawing.DXF')).toBe('dxf');
  });

  it('getFileExtension returns empty string for no extension', () => {
    expect(getFileExtension('noextension')).toBe('');
  });

  it('getFileExtension handles multiple dots', () => {
    expect(getFileExtension('my.model.ifc')).toBe('ifc');
  });

  it('isFormatSupported returns true for supported format', () => {
    expect(isFormatSupported('ifc', SUPPORTED_IMPORT_FORMATS)).toBe(true);
    expect(isFormatSupported('dxf', SUPPORTED_IMPORT_FORMATS)).toBe(true);
  });

  it('isFormatSupported is case-insensitive', () => {
    expect(isFormatSupported('IFC', SUPPORTED_IMPORT_FORMATS)).toBe(true);
  });

  it('isFormatSupported returns false for unsupported format', () => {
    expect(isFormatSupported('xyz', SUPPORTED_IMPORT_FORMATS)).toBe(false);
  });

  it('detectFormat returns format for supported extension', () => {
    expect(detectFormat('building.ifc')).toBe('ifc');
    expect(detectFormat('drawing.dxf')).toBe('dxf');
  });

  it('detectFormat returns null for unsupported extension', () => {
    expect(detectFormat('file.xyz')).toBeNull();
  });

  it('createUnsupportedFormatError creates UnsupportedFormatError', () => {
    const err = createUnsupportedFormatError('xyz');
    expect(err).toBeInstanceOf(UnsupportedFormatError);
  });

  it('createCorruptedFileError creates CorruptedFileError', () => {
    const err = createCorruptedFileError('ifc', 'bad data');
    expect(err).toBeInstanceOf(CorruptedFileError);
    expect(err.details).toBe('bad data');
  });

  it('SUPPORTED_IMPORT_FORMATS includes ifc, dxf, dwg', () => {
    expect(SUPPORTED_IMPORT_FORMATS).toContain('ifc');
    expect(SUPPORTED_IMPORT_FORMATS).toContain('dxf');
    expect(SUPPORTED_IMPORT_FORMATS).toContain('dwg');
  });

  it('SUPPORTED_EXPORT_FORMATS includes ifc, dxf, pdf', () => {
    expect(SUPPORTED_EXPORT_FORMATS).toContain('ifc');
    expect(SUPPORTED_EXPORT_FORMATS).toContain('dxf');
    expect(SUPPORTED_EXPORT_FORMATS).toContain('pdf');
  });
});

describe('T-IO-005: importWithProgress', () => {
  it('returns success result for valid content', async () => {
    const result = await importWithProgress(
      async () => 'hello content',
      (s) => s.toUpperCase()
    );
    expect(result.success).toBe(true);
    expect(result.data).toBe('HELLO CONTENT');
    expect(result.errors).toHaveLength(0);
  });

  it('returns failure when file exceeds maxFileSize', async () => {
    const result = await importWithProgress(
      async () => 'x'.repeat(200),
      (s) => s,
      { maxFileSize: 100 }
    );
    expect(result.success).toBe(false);
    expect(result.errors[0].type).toBe('size');
  });

  it('returns parse error when parse throws', async () => {
    const result = await importWithProgress(
      async () => 'bad data',
      () => { throw new Error('parse failed'); }
    );
    expect(result.success).toBe(false);
    expect(result.errors[0].type).toBe('parse');
  });

  it('calls onProgress callback', async () => {
    const onProgress = vi.fn();
    await importWithProgress(
      async () => 'data',
      (s) => s,
      { onProgress }
    );
    expect(onProgress).toHaveBeenCalled();
  });

  it('returns io error when readStream throws', async () => {
    const result = await importWithProgress(
      async () => { throw new Error('network error'); },
      (s) => s
    );
    expect(result.success).toBe(false);
    expect(result.errors[0].type).toBe('io');
  });

  it('result progress reaches complete phase on success', async () => {
    const result = await importWithProgress(
      async () => 'data',
      (s) => s
    );
    expect(result.progress.phase).toBe('complete');
  });
});

describe('T-IO-006: batchImportFiles', () => {
  it('returns total count', async () => {
    const result = await batchImportFiles(
      [{ name: 'a.ifc', content: 'data' }, { name: 'b.dxf', content: 'data' }],
      (content) => content
    );
    expect(result.total).toBe(2);
  });

  it('counts successful imports', async () => {
    const result = await batchImportFiles(
      [{ name: 'a.ifc', content: 'data' }],
      (content) => content
    );
    expect(result.successful).toBe(1);
    expect(result.failed).toBe(0);
  });

  it('counts failed imports for unsupported formats', async () => {
    const result = await batchImportFiles(
      [{ name: 'a.xyz', content: 'data' }],
      (content) => content
    );
    expect(result.failed).toBe(1);
    expect(result.successful).toBe(0);
  });

  it('captures parse error in results', async () => {
    const result = await batchImportFiles(
      [{ name: 'a.ifc', content: 'bad' }],
      () => { throw new Error('parse failed'); }
    );
    expect(result.failed).toBe(1);
    expect(result.results[0].error).toContain('parse failed');
  });

  it('handles mixed success and failure', async () => {
    const result = await batchImportFiles(
      [
        { name: 'good.ifc', content: 'ok' },
        { name: 'bad.xyz', content: 'ok' },
      ],
      (content) => content
    );
    expect(result.successful).toBe(1);
    expect(result.failed).toBe(1);
  });
});

describe('exportDocument', () => {
  it('exports opencad format as JSON', async () => {
    const result = await exportDocument({ id: 'test' }, { format: 'opencad' });
    expect(result.mimeType).toBe('application/json');
    expect(result.extension).toBe('opencad');
    expect(JSON.parse(result.content).id).toBe('test');
  });

  it('exports json format', async () => {
    const result = await exportDocument({ name: 'test' }, { format: 'json' });
    expect(result.mimeType).toBe('application/json');
  });

  it('exports ifc format', async () => {
    const result = await exportDocument('IFC content', { format: 'ifc' });
    expect(result.mimeType).toBe('application/step');
    expect(result.extension).toBe('ifc');
  });

  it('exports dxf format', async () => {
    const result = await exportDocument('DXF content', { format: 'dxf' });
    expect(result.mimeType).toBe('application/dxf');
  });

  it('throws for unsupported export format', async () => {
    await expect(
      exportDocument({}, { format: 'xyz' as 'json' })
    ).rejects.toBeInstanceOf(UnsupportedFormatError);
  });
});

describe('validateDocumentStructure', () => {
  it('returns empty warnings for valid document', () => {
    const warnings = validateDocumentStructure({
      id: 'test',
      metadata: {},
      content: {},
      organization: {},
    });
    expect(warnings).toHaveLength(0);
  });

  it('warns for missing id', () => {
    const warnings = validateDocumentStructure({ metadata: {}, content: {}, organization: {} });
    expect(warnings.some((w) => w.includes('id'))).toBe(true);
  });

  it('warns for missing metadata', () => {
    const warnings = validateDocumentStructure({ id: 'test', content: {}, organization: {} });
    expect(warnings.some((w) => w.includes('metadata'))).toBe(true);
  });

  it('warns for missing content', () => {
    const warnings = validateDocumentStructure({ id: 'test', metadata: {}, organization: {} });
    expect(warnings.some((w) => w.includes('content'))).toBe(true);
  });

  it('warns for missing organization', () => {
    const warnings = validateDocumentStructure({ id: 'test', metadata: {}, content: {} });
    expect(warnings.some((w) => w.includes('organization'))).toBe(true);
  });

  it('warns when data is not an object', () => {
    const warnings = validateDocumentStructure('not an object');
    expect(warnings).toHaveLength(1);
  });

  it('warns when data is null', () => {
    const warnings = validateDocumentStructure(null);
    expect(warnings.length).toBeGreaterThan(0);
  });
});
