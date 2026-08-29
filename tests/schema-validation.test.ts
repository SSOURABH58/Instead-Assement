import { describe, it, expect } from 'vitest';
import { TaxFormEngine } from '../src/engine/index.js';

describe('Schema Validation', () => {
  it('rejects invalid annotation missing required fields', () => {
    const invalidSpec = {
      formId: 'TEST-FORM',
      // missing formName, taxYear, revision, pageSize, fields
    };

    const result = TaxFormEngine.validateAnnotation(invalidSpec);
    expect(result.valid).toBe(false);
    expect(result.errors && result.errors.length > 0).toBe(true);
  });

  it('accepts valid minimal annotation', () => {
    const validSpec = {
      formId: 'IRS-TEST',
      formName: 'Test Form',
      taxYear: 2025,
      revision: '2025.1',
      pageCount: 1,
      pageSize: {
        width: 612,
        height: 792,
        unit: 'pt',
        coordinateOrigin: 'TOP_LEFT',
      },
      fields: [
        {
          id: 'test_field_1',
          label: 'Test Field',
          type: 'STRING',
          dataPath: 'user.name',
          layoutStrategy: 'SINGLE_BOX',
          bounds: [
            {
              pageIndex: 0,
              box: { x: 100, y: 100, width: 200, height: 20 },
            },
          ],
        },
      ],
    };

    const result = TaxFormEngine.validateAnnotation(validSpec);
    expect(result.valid).toBe(true);
  });
});
