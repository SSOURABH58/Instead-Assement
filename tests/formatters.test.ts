import { describe, it, expect } from 'vitest';
import { TaxFormatter } from '../src/engine/formatters.js';
import {
  CheckStyle,
  DatePattern,
  DateTimeSplitMode,
  FieldType,
  NegativeNumberStyle,
  SSNFormat,
  TextCasing,
} from '../src/types/schema.js';

describe('TaxFormatter', () => {
  it('formats currency correctly (whole dollar & negative in parentheses)', () => {
    expect(
      TaxFormatter.formatCurrency(185420.5, {
        roundToWholeDollar: true,
      })
    ).toBe('185,421');

    expect(
      TaxFormatter.formatCurrency(-3000, {
        roundToWholeDollar: true,
        negativeStyle: NegativeNumberStyle.PARENTHESES,
      })
    ).toBe('(3,000)');

    expect(
      TaxFormatter.formatCurrency(1234.56, {
        roundToWholeDollar: false,
        showSymbol: true,
      })
    ).toBe('$1,234.56');
  });

  it('formats SSN in dashed, masked, and raw modes', () => {
    expect(TaxFormatter.formatSSN('123456789', { format: SSNFormat.DASHED })).toBe('123-45-6789');
    expect(TaxFormatter.formatSSN('123456789', { format: SSNFormat.MASKED })).toBe('***-**-6789');
    expect(TaxFormatter.formatSSN('123-45-6789', { format: SSNFormat.RAW })).toBe('123456789');
  });

  it('formats EIN correctly', () => {
    expect(TaxFormatter.formatEIN('123456789', { format: SSNFormat.DASHED })).toBe('12-3456789');
  });

  it('formats dates in various IRS patterns', () => {
    const testDate = new Date('2026-04-15T00:00:00Z');
    expect(TaxFormatter.formatDate(testDate, { pattern: DatePattern.MM_DD_YYYY })).toBe('04/15/2026');
    expect(TaxFormatter.formatDate(testDate, { pattern: DatePattern.MMDDYYYY })).toBe('04152026');
    expect(TaxFormatter.formatDate(testDate, { pattern: DatePattern.YYYY_MM_DD })).toBe('2026-04-15');
  });

  it('formats DateTime with split modes', () => {
    const timestamp = '2026-04-14T15:45:00.000';
    expect(
      TaxFormatter.formatDateTime(timestamp, { splitMode: DateTimeSplitMode.DATE_ONLY })
    ).toBe('04/14/2026');

    expect(
      TaxFormatter.formatDateTime(timestamp, { splitMode: DateTimeSplitMode.TIME_ONLY })
    ).toBe('03:45 PM');
  });

  it('formats boolean checkboxes and choice marks', () => {
    expect(TaxFormatter.formatBooleanCheck(true, { checkStyle: CheckStyle.X })).toBe('X');
    expect(TaxFormatter.formatBooleanCheck(true, { checkStyle: CheckStyle.CHECKMARK })).toBe('✓');
    expect(TaxFormatter.formatBooleanCheck(false)).toBe('');
    expect(
      TaxFormatter.formatBooleanCheck('MARRIED_FILING_JOINTLY', {
        checkedValueMatch: 'MARRIED_FILING_JOINTLY',
      })
    ).toBe('X');
  });

  it('formats text casing and trimming', () => {
    expect(TaxFormatter.formatText('  john smith  ', { casing: TextCasing.UPPERCASE })).toBe(
      'JOHN SMITH'
    );
    expect(TaxFormatter.formatText('john smith', { casing: TextCasing.TITLECASE })).toBe(
      'John Smith'
    );
  });
});
