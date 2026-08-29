import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { CalculatedRenderElement } from './geometry.js';
import { PageSize, StandardFontFamily } from '../types/schema.js';

export interface RenderOptions {
  templatePdfBuffer?: Uint8Array | ArrayBuffer;
  debugBoundingBoxes?: boolean;
}

export class PdfOverlayRenderer {
  /**
   * Renders calculated elements onto a PDF document (overlaying on existing template or blank pages).
   */
  public static async render(
    elements: CalculatedRenderElement[],
    pageSize: PageSize,
    pageCount: number,
    options?: RenderOptions
  ): Promise<Uint8Array> {
    let pdfDoc: PDFDocument;

    if (options?.templatePdfBuffer && options.templatePdfBuffer.byteLength > 0) {
      pdfDoc = await PDFDocument.load(options.templatePdfBuffer);
    } else {
      pdfDoc = await PDFDocument.create();
      for (let p = 0; p < Math.max(1, pageCount); p++) {
        pdfDoc.addPage([pageSize.width, pageSize.height]);
      }
    }

    // Embed Standard Fonts
    const fontMap = {
      [StandardFontFamily.HELVETICA]: await pdfDoc.embedFont(StandardFonts.Helvetica),
      [StandardFontFamily.HELVETICA_BOLD]: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
      [StandardFontFamily.COURIER]: await pdfDoc.embedFont(StandardFonts.Courier),
      [StandardFontFamily.TIMES_ROMAN]: await pdfDoc.embedFont(StandardFonts.TimesRoman),
    };

    const defaultFont = fontMap[StandardFontFamily.HELVETICA];
    const totalPages = pdfDoc.getPageCount();

    for (const elem of elements) {
      if (elem.pageIndex >= totalPages) {
        continue;
      }

      const page = pdfDoc.getPage(elem.pageIndex);
      const font = fontMap[elem.fontFamily as StandardFontFamily] || defaultFont;
      const color = this.parseHexColor(elem.fontColorHex);

      page.drawText(elem.text, {
        x: elem.x,
        y: elem.y,
        size: elem.fontSize,
        font,
        color,
      });
    }

    return await pdfDoc.save();
  }

  private static parseHexColor(hex?: string) {
    if (!hex || !/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      return rgb(0, 0, 0);
    }

    const r = parseInt(hex.substring(1, 3), 16) / 255;
    const g = parseInt(hex.substring(3, 5), 16) / 255;
    const b = parseInt(hex.substring(5, 7), 16) / 255;

    return rgb(r, g, b);
  }
}
