import {
  BoundingBox,
  CoordinateOrigin,
  GeometryTarget,
  LayoutStrategy,
  MeasurementUnit,
  PageSize,
  TaxFormField,
  TextAlignment,
  VerticalAlignment,
} from '../types/schema.js';
import { TaxFormatter } from './formatters.js';

export interface CalculatedRenderElement {
  pageIndex: number;
  text: string;
  x: number;
  y: number; // in native PDF coordinate points (bottom-left origin)
  fontSize: number;
  fontFamily: string;
  fontColorHex: string;
  rotation: number;
  isCombCell?: boolean;
}

export class GeometryEngine {
  /**
   * Translates an annotation field with one or multiple bounding shapes into discrete
   * printable PDF render elements with exact coordinates and typography.
   */
  public static calculateRenderElements(
    field: TaxFormField,
    rawValue: any,
    pageSize: PageSize,
    defaultStyling: { fontFamily: string; fontSize: number; fontColorHex: string }
  ): CalculatedRenderElement[] {
    const formattedText = TaxFormatter.format(rawValue, field.type, field.format);
    const elements: CalculatedRenderElement[] = [];

    const strategy = field.layoutStrategy || LayoutStrategy.SINGLE_BOX;

    switch (strategy) {
      case LayoutStrategy.CHARACTER_SLICE:
        return this.layoutCharacterSlice(field, formattedText, pageSize, defaultStyling);

      case LayoutStrategy.MULTI_LINE_WRAP:
        return this.layoutMultiLineWrap(field, formattedText, pageSize, defaultStyling);

      case LayoutStrategy.SUBFIELD_MAPPING:
        return this.layoutSubfieldMapping(field, rawValue, pageSize, defaultStyling);

      case LayoutStrategy.OVERFLOW_CHAIN:
        return this.layoutOverflowChain(field, formattedText, pageSize, defaultStyling);

      case LayoutStrategy.SINGLE_BOX:
      default:
        return this.layoutSingleBox(field, formattedText, pageSize, defaultStyling);
    }
  }

  /**
   * Layout strategy: SINGLE_BOX or Comb Box.
   */
  private static layoutSingleBox(
    field: TaxFormField,
    text: string,
    pageSize: PageSize,
    defaultStyling: { fontFamily: string; fontSize: number; fontColorHex: string }
  ): CalculatedRenderElement[] {
    if (!text || field.bounds.length === 0) return [];

    const target = field.bounds[0];
    return this.renderTargetContent(target, text, pageSize, defaultStyling);
  }

  /**
   * Layout strategy: CHARACTER_SLICE.
   * Partitions a formatted string across multiple disjoint boxes based on character ranges.
   * e.g., SSN split into [0,3] (Box 1), [3,5] (Box 2), [5,9] (Box 3).
   */
  private static layoutCharacterSlice(
    field: TaxFormField,
    text: string,
    pageSize: PageSize,
    defaultStyling: { fontFamily: string; fontSize: number; fontColorHex: string }
  ): CalculatedRenderElement[] {
    const elements: CalculatedRenderElement[] = [];
    const cleanChars = text.replace(/[-–—\s]/g, ''); // strip visual dashes for comb slice if needed

    for (let i = 0; i < field.bounds.length; i++) {
      const target = field.bounds[i];
      let sliceText = '';

      if (target.characterRange && target.characterRange.length === 2) {
        const [start, end] = target.characterRange;
        sliceText = cleanChars.substring(start, end);
      } else if (target.maxCharacters) {
        // Fallback: take next N characters
        const start = elements.length;
        sliceText = cleanChars.substring(start, start + target.maxCharacters);
      } else {
        sliceText = cleanChars;
      }

      if (sliceText) {
        elements.push(...this.renderTargetContent(target, sliceText, pageSize, defaultStyling));
      }
    }

    return elements;
  }

  /**
   * Layout strategy: MULTI_LINE_WRAP.
   * Flows text across multiple non-contiguous geometric line shapes or boxes on the page.
   * Handles text that starts in one box, breaks around static text/folds, and continues in another box.
   */
  private static layoutMultiLineWrap(
    field: TaxFormField,
    text: string,
    pageSize: PageSize,
    defaultStyling: { fontFamily: string; fontSize: number; fontColorHex: string }
  ): CalculatedRenderElement[] {
    const elements: CalculatedRenderElement[] = [];
    const words = text.split(/\s+/);
    let wordIndex = 0;

    for (let i = 0; i < field.bounds.length && wordIndex < words.length; i++) {
      const target = field.bounds[i];
      const fontSize = target.fontSize ?? defaultStyling.fontSize;
      const targetWidth = this.convertToPdfPoints(target.box.width, pageSize.unit, pageSize.width);

      // Estimate average char width ~ 0.55 of font size
      const maxCharsPerLine = target.maxCharacters ?? Math.max(1, Math.floor(targetWidth / (fontSize * 0.55)));

      const lineWords: string[] = [];
      let currentLength = 0;

      while (wordIndex < words.length) {
        const nextWord = words[wordIndex];
        const addedLength = currentLength === 0 ? nextWord.length : currentLength + 1 + nextWord.length;

        if (addedLength <= maxCharsPerLine) {
          lineWords.push(nextWord);
          currentLength = addedLength;
          wordIndex++;
        } else {
          // If a single word is longer than maxCharsPerLine, break it
          if (lineWords.length === 0) {
            lineWords.push(nextWord.substring(0, maxCharsPerLine));
            words[wordIndex] = nextWord.substring(maxCharsPerLine);
          }
          break;
        }
      }

      const lineText = lineWords.join(' ');
      if (lineText) {
        elements.push(...this.renderTargetContent(target, lineText, pageSize, defaultStyling));
      }
    }

    return elements;
  }

  /**
   * Layout strategy: SUBFIELD_MAPPING.
   * Maps subcomponents of a single field (e.g. split Date & Time, or Address components)
   * to respective disjoint geometry targets via subfieldKey.
   */
  private static layoutSubfieldMapping(
    field: TaxFormField,
    rawValue: any,
    pageSize: PageSize,
    defaultStyling: { fontFamily: string; fontSize: number; fontColorHex: string }
  ): CalculatedRenderElement[] {
    const elements: CalculatedRenderElement[] = [];

    if (!field.subfields || field.subfields.length === 0) {
      return this.layoutSingleBox(field, String(rawValue ?? ''), pageSize, defaultStyling);
    }

    for (const subfield of field.subfields) {
      // Find matching geometry target by subfieldKey
      const target = field.bounds.find((b) => b.subfieldKey === subfield.key);
      if (!target) continue;

      let subValue: any = rawValue;
      if (typeof rawValue === 'object' && rawValue !== null) {
        subValue = rawValue[subfield.dataPath] ?? rawValue;
      }

      // Apply transform if specified
      let text = TaxFormatter.extractSubfield(subValue, subfield.transform);
      if (subfield.format) {
        text = TaxFormatter.format(text, subfield.type as any, subfield.format);
      }

      if (text) {
        elements.push(...this.renderTargetContent(target, text, pageSize, defaultStyling));
      }
    }

    return elements;
  }

  /**
   * Layout strategy: OVERFLOW_CHAIN.
   * Fills the primary target box up to max characters/width, then overflows the rest into
   * subsequent overflow-designated boxes.
   */
  private static layoutOverflowChain(
    field: TaxFormField,
    text: string,
    pageSize: PageSize,
    defaultStyling: { fontFamily: string; fontSize: number; fontColorHex: string }
  ): CalculatedRenderElement[] {
    const elements: CalculatedRenderElement[] = [];
    let remainingText = text;

    for (let i = 0; i < field.bounds.length && remainingText.length > 0; i++) {
      const target = field.bounds[i];
      const maxChars = target.maxCharacters ?? 40;

      const currentSegment = remainingText.substring(0, maxChars);
      remainingText = remainingText.substring(maxChars);

      elements.push(...this.renderTargetContent(target, currentSegment, pageSize, defaultStyling));
    }

    return elements;
  }

  /**
   * Renders content inside a specific GeometryTarget, handling Comb spacing, alignment,
   * font scaling, and coordinate origin conversions.
   */
  private static renderTargetContent(
    target: GeometryTarget,
    text: string,
    pageSize: PageSize,
    defaultStyling: { fontFamily: string; fontSize: number; fontColorHex: string }
  ): CalculatedRenderElement[] {
    const elements: CalculatedRenderElement[] = [];
    const box = target.box;

    const pdfX = this.convertToPdfPoints(box.x, pageSize.unit, pageSize.width);
    const pdfWidth = this.convertToPdfPoints(box.width, pageSize.unit, pageSize.width);
    const pdfHeight = this.convertToPdfPoints(box.height, pageSize.unit, pageSize.height);

    // Convert Y origin (Top-Left vs Bottom-Left)
    // In Top-Left, pdfY in PDF points = pageHeight - (y + height)
    const rawY = this.convertToPdfPoints(box.y, pageSize.unit, pageSize.height);
    const pdfY =
      pageSize.coordinateOrigin === CoordinateOrigin.TOP_LEFT
        ? pageSize.height - rawY - pdfHeight
        : rawY;

    const targetStyle = target.style || {};
    let fontSize = target.fontSize ?? targetStyle.fontSize ?? defaultStyling.fontSize;
    let fontFamily = target.fontFamily ?? targetStyle.fontFamily ?? defaultStyling.fontFamily;
    const fontColorHex = target.fontColorHex ?? targetStyle.fontColorHex ?? defaultStyling.fontColorHex;
    const fontStyle = target.fontStyle ?? targetStyle.fontStyle;

    if (fontStyle === 'BOLD' && fontFamily === StandardFontFamily.HELVETICA) {
      fontFamily = StandardFontFamily.HELVETICA_BOLD;
    }

    // Handle Comb Boxes (e.g. individual character boxes for SSN/EIN)
    if (target.comb && target.comb.enabled) {
      const cellCount = target.comb.cellCount;
      const cellSpacing = target.comb.cellSpacing || 0;
      const cellWidth = target.comb.cellWidth || (pdfWidth - (cellCount - 1) * cellSpacing) / cellCount;

      const chars = text.replace(/[\s-]/g, '').split('');

      for (let c = 0; c < Math.min(chars.length, cellCount); c++) {
        const char = chars[c];
        const cellX = pdfX + c * (cellWidth + cellSpacing);
        // Center character inside its comb cell
        const approxCharWidth = fontSize * 0.55;
        const charX = cellX + (cellWidth - approxCharWidth) / 2;
        const charY = pdfY + (pdfHeight - fontSize) / 2 + fontSize * 0.2;

        elements.push({
          pageIndex: target.pageIndex,
          text: char,
          x: charX,
          y: charY,
          fontSize,
          fontFamily,
          fontColorHex,
          rotation: target.rotation || 0,
          isCombCell: true,
        });
      }

      return elements;
    }

    // Auto-shrink font size if text exceeds box width
    if (target.autoShrinkToFit) {
      const estimatedWidth = text.length * fontSize * 0.55;
      if (estimatedWidth > pdfWidth && pdfWidth > 0) {
        const scaledFont = (pdfWidth / text.length) / 0.55;
        fontSize = Math.max(target.minFontSize ?? 6, Math.min(fontSize, scaledFont));
      }
    }

    // Calculate text alignment offset
    let textX = pdfX;
    const approxTotalWidth = text.length * fontSize * 0.55;

    if (target.align === TextAlignment.CENTER) {
      textX = pdfX + Math.max(0, (pdfWidth - approxTotalWidth) / 2);
    } else if (target.align === TextAlignment.RIGHT) {
      textX = pdfX + Math.max(0, pdfWidth - approxTotalWidth - 2);
    } else {
      // Left aligned with small 2pt padding
      textX = pdfX + 2;
    }

    // Vertical alignment offset
    let textY = pdfY;
    if (target.verticalAlign === VerticalAlignment.TOP) {
      textY = pdfY + pdfHeight - fontSize;
    } else if (target.verticalAlign === VerticalAlignment.BOTTOM) {
      textY = pdfY + 2;
    } else {
      // Middle
      textY = pdfY + (pdfHeight - fontSize) / 2 + fontSize * 0.15;
    }

    elements.push({
      pageIndex: target.pageIndex,
      text,
      x: textX,
      y: textY,
      fontSize,
      fontFamily,
      fontColorHex,
      rotation: target.rotation || 0,
    });

    return elements;
  }

  private static convertToPdfPoints(
    val: number,
    unit: MeasurementUnit = MeasurementUnit.PT,
    pageDimension: number
  ): number {
    switch (unit) {
      case MeasurementUnit.NORMALIZED:
        return val * pageDimension;
      case MeasurementUnit.IN:
        return val * 72;
      case MeasurementUnit.MM:
        return val * 2.83465;
      case MeasurementUnit.PT:
      default:
        return val;
    }
  }
}
