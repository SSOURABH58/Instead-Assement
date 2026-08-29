import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { TaxFormEngine } from '../src/engine/index.js';

describe('TaxFormEngine & PDF Overlay Integration', () => {
  it('processes Form 1040 annotation with sample data and generates valid PDF', async () => {
    const form1040Json = JSON.parse(
      fs.readFileSync(path.resolve('forms/form-1040/form-1040.annotation.json'), 'utf-8')
    );
    const sampleData = JSON.parse(
      fs.readFileSync(path.resolve('forms/form-1040/sample-data.json'), 'utf-8')
    );

    // Validation check
    const validation = TaxFormEngine.validateAnnotation(form1040Json);
    expect(validation.valid).toBe(true);
    expect(validation.data).toBeDefined();

    // Process field coordinates & layout
    const processed = TaxFormEngine.processForm(validation.data!, sampleData);
    expect(processed.fieldValues.length).toBe(form1040Json.fields.length);
    expect(processed.allRenderElements.length).toBeGreaterThan(form1040Json.fields.length);

    // PDF generation check
    const pdfBytes = await TaxFormEngine.renderToPdf(validation.data!, sampleData);
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.byteLength).toBeGreaterThan(1000);

    // Verify PDF header magic bytes "%PDF-"
    const header = Buffer.from(pdfBytes.slice(0, 5)).toString('utf-8');
    expect(header).toBe('%PDF-');
  });

  it('processes Form W-2 annotation and produces valid PDF', async () => {
    const formW2Json = JSON.parse(
      fs.readFileSync(path.resolve('forms/form-w2/form-w2.annotation.json'), 'utf-8')
    );
    const sampleData = JSON.parse(
      fs.readFileSync(path.resolve('forms/form-w2/sample-data.json'), 'utf-8')
    );

    const validation = TaxFormEngine.validateAnnotation(formW2Json);
    expect(validation.valid).toBe(true);

    const pdfBytes = await TaxFormEngine.renderToPdf(validation.data!, sampleData);
    expect(pdfBytes.byteLength).toBeGreaterThan(1000);
  });
});
