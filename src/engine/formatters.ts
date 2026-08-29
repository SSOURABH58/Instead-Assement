import {
  CheckStyle,
  DatePattern,
  DateTimeSplitMode,
  FieldFormatConfig,
  FieldType,
  NegativeNumberStyle,
  SSNFormat,
  TextCasing,
} from '../types/schema.js';

export class TaxFormatter {
  /**
   * Main formatting entry point that applies type-specific formatting rules.
   */
  public static format(value: any, type: FieldType, config?: FieldFormatConfig): string {
    if (value === null || value === undefined) {
      return '';
    }

    switch (type) {
      case FieldType.CURRENCY:
        return this.formatCurrency(value, config?.currency);

      case FieldType.SSN:
        return this.formatSSN(value, config?.ssn);

      case FieldType.EIN:
        return this.formatEIN(value, config?.ein);

      case FieldType.DATE:
        return this.formatDate(value, config?.date);

      case FieldType.DATETIME:
        return this.formatDateTime(value, config?.datetime);

      case FieldType.BOOLEAN_CHECK:
      case FieldType.CHOICE:
        return this.formatBooleanCheck(value, config?.booleanCheck);

      case FieldType.NUMBER:
        return this.formatNumber(value);

      case FieldType.PHONE:
        return this.formatPhone(value);

      case FieldType.STRING:
      case FieldType.ROUTING_NUMBER:
      case FieldType.ACCOUNT_NUMBER:
      default:
        return this.formatText(String(value), config?.text);
    }
  }

  /**
   * Formats numbers as IRS-compliant currency strings.
   * e.g., 12345.67 -> "12,346" (if rounded to whole dollar)
   * e.g., -500 -> "(500)"
   */
  public static formatCurrency(
    value: any,
    config?: {
      roundToWholeDollar?: boolean;
      negativeStyle?: NegativeNumberStyle;
      showSymbol?: boolean;
      suppressZero?: boolean;
    }
  ): string {
    const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]+/g, ''));
    if (isNaN(num)) return '';

    if (num === 0 && config?.suppressZero) {
      return '';
    }

    const round = config?.roundToWholeDollar ?? true;
    const negStyle = config?.negativeStyle ?? NegativeNumberStyle.PARENTHESES;
    const showSymbol = config?.showSymbol ?? false;

    const isNegative = num < 0;
    const absVal = Math.abs(num);

    let formattedNumber: string;
    if (round) {
      const rounded = Math.round(absVal);
      formattedNumber = rounded.toLocaleString('en-US', { maximumFractionDigits: 0 });
    } else {
      formattedNumber = absVal.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }

    let result = formattedNumber;
    if (showSymbol) {
      result = `$${result}`;
    }

    if (isNegative) {
      if (negStyle === NegativeNumberStyle.PARENTHESES) {
        result = `(${result})`;
      } else if (negStyle === NegativeNumberStyle.MINUS) {
        result = `-${result}`;
      }
    }

    return result;
  }

  /**
   * Formats a Social Security Number.
   * e.g. "123456789" -> "123-45-6789" or "***-**-6789"
   */
  public static formatSSN(
    value: any,
    config?: { format?: SSNFormat; maskChar?: string }
  ): string {
    const digits = String(value).replace(/\D/g, '');
    if (digits.length !== 9) {
      return String(value);
    }

    const format = config?.format ?? SSNFormat.DASHED;
    const mask = config?.maskChar ?? '*';

    if (format === SSNFormat.RAW) {
      return digits;
    }

    if (format === SSNFormat.MASKED) {
      const maskedPart = mask.repeat(3) + '-' + mask.repeat(2) + '-';
      return `${maskedPart}${digits.substring(5)}`;
    }

    // Default DASHED
    return `${digits.substring(0, 3)}-${digits.substring(3, 5)}-${digits.substring(5)}`;
  }

  /**
   * Formats an Employer Identification Number.
   * e.g. "123456789" -> "12-3456789"
   */
  public static formatEIN(
    value: any,
    config?: { format?: SSNFormat }
  ): string {
    const digits = String(value).replace(/\D/g, '');
    if (digits.length !== 9) {
      return String(value);
    }

    const format = config?.format ?? SSNFormat.DASHED;
    if (format === SSNFormat.RAW) {
      return digits;
    }

    if (format === SSNFormat.MASKED) {
      return `**-***${digits.substring(5)}`;
    }

    return `${digits.substring(0, 2)}-${digits.substring(2)}`;
  }

  /**
   * Formats a date into IRS requested patterns.
   */
  public static formatDate(
    value: any,
    config?: { pattern?: DatePattern }
  ): string {
    const date = this.parseDate(value);
    if (!date) return String(value);

    const pattern = config?.pattern ?? DatePattern.MM_DD_YYYY;

    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const yyyy = String(date.getFullYear());
    const yy = yyyy.substring(2);
    const m = String(date.getMonth() + 1);
    const d = String(date.getDate());

    switch (pattern) {
      case DatePattern.MM_DD_YYYY:
        return `${mm}/${dd}/${yyyy}`;
      case DatePattern.MMDDYYYY:
        return `${mm}${dd}${yyyy}`;
      case DatePattern.YYYY_MM_DD:
        return `${yyyy}-${mm}-${dd}`;
      case DatePattern.MM_YY:
        return `${mm}/${yy}`;
      case DatePattern.M_D_YY:
        return `${m}/${d}/${yy}`;
      default:
        return `${mm}/${dd}/${yyyy}`;
    }
  }

  /**
   * Formats a combined timestamp / ISO date into full or split representations.
   */
  public static formatDateTime(
    value: any,
    config?: { pattern?: string; splitMode?: DateTimeSplitMode }
  ): string {
    const date = this.parseDate(value);
    if (!date) return String(value);

    const splitMode = config?.splitMode ?? DateTimeSplitMode.NONE;

    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const yyyy = String(date.getFullYear());

    let hours = date.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 hour is 12
    const hh = String(hours).padStart(2, '0');
    const mins = String(date.getMinutes()).padStart(2, '0');

    if (splitMode === DateTimeSplitMode.DATE_ONLY) {
      return `${mm}/${dd}/${yyyy}`;
    }

    if (splitMode === DateTimeSplitMode.TIME_ONLY) {
      return `${hh}:${mins} ${ampm}`;
    }

    return `${mm}/${dd}/${yyyy} ${hh}:${mins} ${ampm}`;
  }

  /**
   * Evaluates and formats checkboxes or radio choice markings.
   */
  public static formatBooleanCheck(
    value: any,
    config?: { checkStyle?: CheckStyle; checkedValueMatch?: any }
  ): string {
    let isChecked = false;

    if (config?.checkedValueMatch !== undefined) {
      isChecked = value === config.checkedValueMatch;
    } else {
      isChecked = Boolean(value) === true && value !== 'false' && value !== 0;
    }

    if (!isChecked) {
      return '';
    }

    const style = config?.checkStyle ?? CheckStyle.X;
    switch (style) {
      case CheckStyle.X:
        return 'X';
      case CheckStyle.CHECKMARK:
        return '✓';
      case CheckStyle.SLASH:
        return '/';
      case CheckStyle.FILLED_RECT:
        return '■';
      default:
        return 'X';
    }
  }

  /**
   * Formats standard text with IRS casing conventions and trimming.
   */
  public static formatText(
    value: string,
    config?: { casing?: TextCasing; trim?: boolean; padLength?: number; padChar?: string }
  ): string {
    let text = value;

    if (config?.trim ?? true) {
      text = text.trim();
    }

    const casing = config?.casing ?? TextCasing.UPPERCASE;
    if (casing === TextCasing.UPPERCASE) {
      text = text.toUpperCase();
    } else if (casing === TextCasing.LOWERCASE) {
      text = text.toLowerCase();
    } else if (casing === TextCasing.TITLECASE) {
      text = text.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
    }

    if (config?.padLength && config.padLength > text.length) {
      text = text.padStart(config.padLength, config.padChar ?? ' ');
    }

    return text;
  }

  public static formatPhone(value: any): string {
    const digits = String(value).replace(/\D/g, '');
    if (digits.length === 10) {
      return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
    }
    return String(value);
  }

  public static formatNumber(value: any): string {
    const num = Number(value);
    return isNaN(num) ? String(value) : num.toLocaleString('en-US');
  }

  /**
   * Applies custom subfield extractors (e.g. extracting Date or Time component from ISO timestamp,
   * or First Name from Full Name).
   */
  public static extractSubfield(
    value: any,
    transform: 'NONE' | 'DATE_PART' | 'TIME_PART' | 'FIRST_NAME' | 'LAST_NAME' | 'AREA_CODE' | 'PHONE_LOCAL' = 'NONE'
  ): string {
    if (value === null || value === undefined) return '';
    const str = String(value);

    switch (transform) {
      case 'DATE_PART': {
        const d = this.parseDate(value);
        if (!d) return str;
        return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
      }
      case 'TIME_PART': {
        const d = this.parseDate(value);
        if (!d) return '';
        let hours = d.getHours();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${String(hours).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} ${ampm}`;
      }
      case 'FIRST_NAME': {
        const parts = str.trim().split(/\s+/);
        return parts[0] || '';
      }
      case 'LAST_NAME': {
        const parts = str.trim().split(/\s+/);
        return parts.slice(1).join(' ') || '';
      }
      case 'AREA_CODE': {
        const digits = str.replace(/\D/g, '');
        return digits.substring(0, 3);
      }
      case 'PHONE_LOCAL': {
        const digits = str.replace(/\D/g, '');
        return digits.length >= 10 ? `${digits.substring(3, 6)}-${digits.substring(6, 10)}` : digits;
      }
      case 'NONE':
      default:
        return str;
    }
  }

  private static parseDate(value: any): Date | null {
    if (value instanceof Date && !isNaN(value.getTime())) {
      return value;
    }
    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return null;
  }
}
