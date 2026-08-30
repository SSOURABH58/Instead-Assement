import { z } from 'zod';

export enum FormJurisdiction {
  US_FEDERAL = 'US_FEDERAL',
  US_STATE = 'US_STATE',
  US_LOCAL = 'US_LOCAL',
}

export enum CoordinateOrigin {
  TOP_LEFT = 'TOP_LEFT',
  BOTTOM_LEFT = 'BOTTOM_LEFT',
}

export enum MeasurementUnit {
  PT = 'pt',
  IN = 'in',
  MM = 'mm',
  NORMALIZED = 'normalized',
}

export enum FieldType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  CURRENCY = 'CURRENCY',
  DATE = 'DATE',
  DATETIME = 'DATETIME',
  BOOLEAN_CHECK = 'BOOLEAN_CHECK',
  SSN = 'SSN',
  EIN = 'EIN',
  PHONE = 'PHONE',
  ROUTING_NUMBER = 'ROUTING_NUMBER',
  ACCOUNT_NUMBER = 'ACCOUNT_NUMBER',
  CHOICE = 'CHOICE',
  COMPOSITE = 'COMPOSITE',
}

export enum LayoutStrategy {
  SINGLE_BOX = 'SINGLE_BOX',
  MULTI_LINE_WRAP = 'MULTI_LINE_WRAP',
  CHARACTER_SLICE = 'CHARACTER_SLICE',
  SUBFIELD_MAPPING = 'SUBFIELD_MAPPING',
  OVERFLOW_CHAIN = 'OVERFLOW_CHAIN',
}

export enum TextAlignment {
  LEFT = 'LEFT',
  CENTER = 'CENTER',
  RIGHT = 'RIGHT',
}

export enum VerticalAlignment {
  TOP = 'TOP',
  MIDDLE = 'MIDDLE',
  BOTTOM = 'BOTTOM',
}

export enum TextCasing {
  UPPERCASE = 'UPPERCASE',
  LOWERCASE = 'LOWERCASE',
  TITLECASE = 'TITLECASE',
  NONE = 'NONE',
}

export enum CheckStyle {
  X = 'X',
  CHECKMARK = 'CHECKMARK',
  FILLED_RECT = 'FILLED_RECT',
  SLASH = 'SLASH',
}

export enum NegativeNumberStyle {
  PARENTHESES = 'PARENTHESES',
  MINUS = 'MINUS',
  NONE = 'NONE',
}

export enum SSNFormat {
  DASHED = 'DASHED',
  MASKED = 'MASKED',
  RAW = 'RAW',
}

export enum DatePattern {
  MM_DD_YYYY = 'MM/DD/YYYY',
  MMDDYYYY = 'MMDDYYYY',
  YYYY_MM_DD = 'YYYY-MM-DD',
  MM_YY = 'MM/YY',
  M_D_YY = 'M/D/YY',
}

export enum DateTimeSplitMode {
  NONE = 'NONE',
  DATE_ONLY = 'DATE_ONLY',
  TIME_ONLY = 'TIME_ONLY',
  DATE_AND_TIME_SEPARATE = 'DATE_AND_TIME_SEPARATE',
}

export enum ConditionOperator {
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  EXISTS = 'EXISTS',
  IN = 'IN',
  IS_TRUE = 'IS_TRUE',
}

export enum StandardFontFamily {
  HELVETICA = 'Helvetica',
  HELVETICA_BOLD = 'Helvetica-Bold',
  COURIER = 'Courier',
  TIMES_ROMAN = 'Times-Roman',
}

export enum FontStyle {
  REGULAR = 'REGULAR',
  BOLD = 'BOLD',
  ITALIC = 'ITALIC',
  BOLD_ITALIC = 'BOLD_ITALIC',
}

export const TextStyleSchema = z.object({
  fontFamily: z.nativeEnum(StandardFontFamily).default(StandardFontFamily.HELVETICA),
  fontSize: z.number().positive().default(9),
  fontColorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#000000'),
  fontStyle: z.nativeEnum(FontStyle).default(FontStyle.REGULAR),
});

// Zod Schemas for Runtime Validation
export const BoundingBoxSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

export const CombConfigSchema = z.object({
  enabled: z.boolean(),
  cellCount: z.number().int().positive(),
  cellWidth: z.number().optional(),
  cellSpacing: z.number().default(0),
});

export const GeometryTargetSchema = z.object({
  pageIndex: z.number().int().nonnegative(),
  shapeType: z.enum(['RECTANGLE', 'LINE_SEGMENT', 'POLYGON']).default('RECTANGLE'),
  box: BoundingBoxSchema,
  comb: CombConfigSchema.optional(),
  maxCharacters: z.number().int().positive().optional(),
  characterRange: z.tuple([z.number().int().nonnegative(), z.number().int().positive()]).optional(),
  subfieldKey: z.string().optional(),
  align: z.nativeEnum(TextAlignment).default(TextAlignment.LEFT),
  verticalAlign: z.nativeEnum(VerticalAlignment).default(VerticalAlignment.MIDDLE),
  style: TextStyleSchema.partial().optional(),
  fontSize: z.number().positive().optional(),
  fontFamily: z.nativeEnum(StandardFontFamily).optional(),
  fontColorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  fontStyle: z.nativeEnum(FontStyle).optional(),
  autoShrinkToFit: z.boolean().default(true),
  minFontSize: z.number().positive().default(6),
  rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]).default(0),
  isOverflowTarget: z.boolean().default(false),
});

export const CurrencyFormatConfigSchema = z.object({
  roundToWholeDollar: z.boolean().default(true),
  negativeStyle: z.nativeEnum(NegativeNumberStyle).default(NegativeNumberStyle.PARENTHESES),
  showSymbol: z.boolean().default(false),
  suppressZero: z.boolean().default(false),
});

export const SSNFormatConfigSchema = z.object({
  format: z.nativeEnum(SSNFormat).default(SSNFormat.DASHED),
  maskChar: z.string().default('*'),
});

export const EINFormatConfigSchema = z.object({
  format: z.nativeEnum(SSNFormat).default(SSNFormat.DASHED),
});

export const DateFormatConfigSchema = z.object({
  pattern: z.nativeEnum(DatePattern).default(DatePattern.MM_DD_YYYY),
});

export const DateTimeFormatConfigSchema = z.object({
  pattern: z.string().default('MM/DD/YYYY hh:mm A'),
  splitMode: z.nativeEnum(DateTimeSplitMode).default(DateTimeSplitMode.NONE),
});

export const BooleanCheckConfigSchema = z.object({
  checkStyle: z.nativeEnum(CheckStyle).default(CheckStyle.X),
  checkedValueMatch: z.any().optional(),
});

export const TextFormatConfigSchema = z.object({
  casing: z.nativeEnum(TextCasing).default(TextCasing.UPPERCASE),
  trim: z.boolean().default(true),
  padLength: z.number().int().positive().optional(),
  padChar: z.string().default(' '),
});

export const FieldFormatConfigSchema = z.object({
  currency: CurrencyFormatConfigSchema.optional(),
  ssn: SSNFormatConfigSchema.optional(),
  ein: EINFormatConfigSchema.optional(),
  date: DateFormatConfigSchema.optional(),
  datetime: DateTimeFormatConfigSchema.optional(),
  booleanCheck: BooleanCheckConfigSchema.optional(),
  text: TextFormatConfigSchema.optional(),
});

export const SubfieldMappingSchema = z.object({
  key: z.string(),
  dataPath: z.string(),
  type: z.string(),
  format: FieldFormatConfigSchema.optional(),
  transform: z.enum([
    'NONE',
    'DATE_PART',
    'TIME_PART',
    'FIRST_NAME',
    'LAST_NAME',
    'AREA_CODE',
    'PHONE_LOCAL',
  ]).optional(),
});

export const RenderConditionSchema = z.object({
  path: z.string(),
  operator: z.nativeEnum(ConditionOperator),
  value: z.any().optional(),
});

export const TaxFormFieldSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),
  type: z.nativeEnum(FieldType),
  dataPath: z.string(),
  fallbackValue: z.any().optional(),
  layoutStrategy: z.nativeEnum(LayoutStrategy).default(LayoutStrategy.SINGLE_BOX),
  format: FieldFormatConfigSchema.optional(),
  bounds: z.array(GeometryTargetSchema).min(1),
  subfields: z.array(SubfieldMappingSchema).optional(),
  condition: RenderConditionSchema.optional(),
});

export const PageSizeSchema = z.object({
  width: z.number().positive().default(612),
  height: z.number().positive().default(792),
  unit: z.nativeEnum(MeasurementUnit).default(MeasurementUnit.PT),
  coordinateOrigin: z.nativeEnum(CoordinateOrigin).default(CoordinateOrigin.TOP_LEFT),
});

export const GlobalStylingSchema = z.object({
  fontFamily: z.nativeEnum(StandardFontFamily).default(StandardFontFamily.HELVETICA),
  fontSize: z.number().positive().default(9),
  fontColorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#000000'),
  fontStyle: z.nativeEnum(FontStyle).default(FontStyle.REGULAR).optional(),
  style: TextStyleSchema.optional(),
});

export const TaxFormAnnotationSchema = z.object({
  formId: z.string(),
  formName: z.string(),
  taxYear: z.number().int().min(1900).max(2100),
  revision: z.string(),
  description: z.string().optional(),
  jurisdiction: z.nativeEnum(FormJurisdiction).default(FormJurisdiction.US_FEDERAL),
  stateCode: z.string().length(2).optional(),
  pageCount: z.number().int().positive().default(1),
  pageSize: PageSizeSchema,
  globalStyling: GlobalStylingSchema.optional(),
  fields: z.array(TaxFormFieldSchema),
});

// TypeScript Types Derived from Zod
export type TextStyle = z.infer<typeof TextStyleSchema>;
export type BoundingBox = z.infer<typeof BoundingBoxSchema>;
export type CombConfig = z.infer<typeof CombConfigSchema>;
export type GeometryTarget = z.infer<typeof GeometryTargetSchema>;
export type CurrencyFormatConfig = z.infer<typeof CurrencyFormatConfigSchema>;
export type SSNFormatConfig = z.infer<typeof SSNFormatConfigSchema>;
export type EINFormatConfig = z.infer<typeof EINFormatConfigSchema>;
export type DateFormatConfig = z.infer<typeof DateFormatConfigSchema>;
export type DateTimeFormatConfig = z.infer<typeof DateTimeFormatConfigSchema>;
export type BooleanCheckConfig = z.infer<typeof BooleanCheckConfigSchema>;
export type TextFormatConfig = z.infer<typeof TextFormatConfigSchema>;
export type FieldFormatConfig = z.infer<typeof FieldFormatConfigSchema>;
export type SubfieldMapping = z.infer<typeof SubfieldMappingSchema>;
export type RenderCondition = z.infer<typeof RenderConditionSchema>;
export type TaxFormField = z.infer<typeof TaxFormFieldSchema>;
export type PageSize = z.infer<typeof PageSizeSchema>;
export type GlobalStyling = z.infer<typeof GlobalStylingSchema>;
export type TaxFormAnnotation = z.infer<typeof TaxFormAnnotationSchema>;
