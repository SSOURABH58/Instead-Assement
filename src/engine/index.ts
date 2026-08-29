import { TaxFormAnnotation, TaxFormAnnotationSchema } from '../types/schema.js';
import { PathResolver } from './path-resolver.js';
import { GeometryEngine, CalculatedRenderElement } from './geometry.js';
import { PdfOverlayRenderer, RenderOptions } from './pdf-renderer.js';

export interface ProcessedFieldValue {
  fieldId: string;
  label: string;
  dataPath: string;
  rawValue: any;
  renderedElements: CalculatedRenderElement[];
}

export class TaxFormEngine {
  /**
   * Validates an annotation JSON specification against the schema.
   */
  public static validateAnnotation(rawSpec: unknown): { valid: boolean; errors?: string[]; data?: TaxFormAnnotation } {
    const result = TaxFormAnnotationSchema.safeParse(rawSpec);
    if (!result.success) {
      const errorMessages = result.error.errors.map(
        (err) => `[Path: ${err.path.join('.')}] - ${err.message}`
      );
      return { valid: false, errors: errorMessages };
    }
    return { valid: true, data: result.data };
  }

  /**
   * Evaluates all field paths and computes rendered geometric coordinates for every shape.
   */
  public static processForm(
    annotation: TaxFormAnnotation,
    taxpayerData: Record<string, any>
  ): {
    fieldValues: ProcessedFieldValue[];
    allRenderElements: CalculatedRenderElement[];
  } {
    const defaultStyling = {
      fontFamily: annotation.globalStyling?.fontFamily ?? 'Helvetica',
      fontSize: annotation.globalStyling?.fontSize ?? 9,
      fontColorHex: annotation.globalStyling?.fontColorHex ?? '#000000',
    };

    const fieldValues: ProcessedFieldValue[] = [];
    const allRenderElements: CalculatedRenderElement[] = [];

    for (const field of annotation.fields) {
      // Evaluate conditional visibility
      if (field.condition && !PathResolver.evaluateCondition(taxpayerData, field.condition)) {
        continue;
      }

      // Resolve nested data path
      const rawValue = PathResolver.resolve(taxpayerData, field.dataPath, field.fallbackValue);

      // Compute multi-shape geometry
      const renderedElements = GeometryEngine.calculateRenderElements(
        field,
        rawValue,
        annotation.pageSize,
        defaultStyling
      );

      fieldValues.push({
        fieldId: field.id,
        label: field.label,
        dataPath: field.dataPath,
        rawValue,
        renderedElements,
      });

      allRenderElements.push(...renderedElements);
    }

    return { fieldValues, allRenderElements };
  }

  /**
   * Complete pipeline: validates, resolves, computes geometry, and renders to PDF buffer.
   */
  public static async renderToPdf(
    annotation: TaxFormAnnotation,
    taxpayerData: Record<string, any>,
    options?: RenderOptions
  ): Promise<Uint8Array> {
    const { allRenderElements } = this.processForm(annotation, taxpayerData);

    return await PdfOverlayRenderer.render(
      allRenderElements,
      annotation.pageSize,
      annotation.pageCount,
      options
    );
  }
}

export * from './path-resolver.js';
export * from './formatters.js';
export * from './geometry.js';
export * from './pdf-renderer.js';
