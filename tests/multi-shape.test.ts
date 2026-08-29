import { describe, it, expect } from 'vitest';
import { GeometryEngine } from '../src/engine/geometry.js';
import {
  FieldType,
  LayoutStrategy,
  MeasurementUnit,
  PageSize,
  TaxFormField,
  CoordinateOrigin,
  TextCasing,
} from '../src/types/schema.js';

describe('GeometryEngine - Multi-Shape and Complex Geometry', () => {
  const standardPageSize: PageSize = {
    width: 612,
    height: 792,
    unit: MeasurementUnit.PT,
    coordinateOrigin: CoordinateOrigin.TOP_LEFT,
  };

  const defaultStyling = { fontFamily: 'Helvetica', fontSize: 9, fontColorHex: '#000000' };

  it('handles CHARACTER_SLICE across segmented comb boxes (3-2-4 SSN)', () => {
    const ssnField: TaxFormField = {
      id: 'test_ssn_comb',
      label: 'Segmented SSN',
      type: FieldType.SSN,
      dataPath: 'ssn',
      layoutStrategy: LayoutStrategy.CHARACTER_SLICE,
      bounds: [
        {
          pageIndex: 0,
          characterRange: [0, 3],
          box: { x: 440, y: 95, width: 36, height: 14 },
          comb: { enabled: true, cellCount: 3 },
        },
        {
          pageIndex: 0,
          characterRange: [3, 5],
          box: { x: 484, y: 95, width: 24, height: 14 },
          comb: { enabled: true, cellCount: 2 },
        },
        {
          pageIndex: 0,
          characterRange: [5, 9],
          box: { x: 516, y: 95, width: 48, height: 14 },
          comb: { enabled: true, cellCount: 4 },
        },
      ],
    };

    const elements = GeometryEngine.calculateRenderElements(
      ssnField,
      '123456789',
      standardPageSize,
      defaultStyling
    );

    // 9 total character cells generated
    expect(elements.length).toBe(9);
    expect(elements.map((e) => e.text).join('')).toBe('123456789');
    expect(elements.every((e) => e.isCombCell)).toBe(true);
  });

  it('handles MULTI_LINE_WRAP across disjoint non-contiguous lines', () => {
    const multiLineField: TaxFormField = {
      id: 'test_multiline_wrap',
      label: 'Address Over Multiple Lines',
      type: FieldType.STRING,
      dataPath: 'address',
      layoutStrategy: LayoutStrategy.MULTI_LINE_WRAP,
      format: { text: { casing: TextCasing.NONE } },
      bounds: [
        { pageIndex: 0, box: { x: 40, y: 145, width: 100, height: 14 }, maxCharacters: 15 },
        { pageIndex: 0, box: { x: 200, y: 145, width: 100, height: 14 }, maxCharacters: 20 },
      ],
    };

    const text = '742 Evergreen Terrace Apt 4B';
    const elements = GeometryEngine.calculateRenderElements(
      multiLineField,
      text,
      standardPageSize,
      defaultStyling
    );

    expect(elements.length).toBe(2);
    expect(elements[0].text).toBe('742 Evergreen');
    expect(elements[1].text).toBe('Terrace Apt 4B');
    expect(elements[0].x).toBe(42); // 40 + 2pt padding
    expect(elements[1].x).toBe(202); // 200 + 2pt padding
  });

  it('handles SUBFIELD_MAPPING for split Date & Time fields', () => {
    const splitDateTimeField: TaxFormField = {
      id: 'test_split_datetime',
      label: 'Signing Timestamp',
      type: FieldType.DATETIME,
      dataPath: 'signing.timestamp',
      layoutStrategy: LayoutStrategy.SUBFIELD_MAPPING,
      subfields: [
        { key: 'date_box', dataPath: 'signing.timestamp', type: 'DATE', transform: 'DATE_PART' },
        { key: 'time_box', dataPath: 'signing.timestamp', type: 'STRING', transform: 'TIME_PART' },
      ],
      bounds: [
        {
          pageIndex: 1,
          subfieldKey: 'date_box',
          box: { x: 400, y: 700, width: 80, height: 14 },
        },
        {
          pageIndex: 1,
          subfieldKey: 'time_box',
          box: { x: 500, y: 700, width: 60, height: 14 },
        },
      ],
    };

    const timestamp = '2026-04-14T15:30:00.000Z';
    const elements = GeometryEngine.calculateRenderElements(
      splitDateTimeField,
      timestamp,
      standardPageSize,
      defaultStyling
    );

    expect(elements.length).toBe(2);
    expect(elements[0].text).toBe('04/14/2026');
    expect(elements[1].text).toMatch(/03:30 PM|09:00 PM|15:30/); // local/UTC depending on timezone
    expect(elements[0].pageIndex).toBe(1);
    expect(elements[1].pageIndex).toBe(1);
  });
});
