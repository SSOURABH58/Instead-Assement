# U.S. Tax Form Annotation Specification

**Version:** 1.0.0  
**Schema Standard:** Universal JSON Schema (Draft 2020-12) & Strict TypeScript Interfaces  
**Target Engine:** Pure TypeScript Zero-Binary PDF Overlay Engine (`pdf-lib`)

---

## 1. Executive Summary

This specification defines a declarative data contract for annotating physical boxes, lines, tables, and grids on U.S. tax forms (such as IRS Form 1040, Form W-2, and Schedules).

It solves four primary engineering challenges:
1. **Multi-Segment Geometry**: Connects a single logical data field to multiple non-contiguous boxes, split date/time fields, character comb grids, or wrapped text lines.
2. **Nested Data Resolution**: Pulls values directly from deeply nested JSON payloads using dot notation, array indices, and filter predicates (`income.schedules[?(@.type=="C")].netProfit`).
3. **IRS Formatting Rules**: Formats currency with whole-dollar rounding and negative parentheses `(1,234)`, dashes SSNs/EINs, formats dates, and auto-shrinks font sizes to prevent text clipping.
4. **Platform Independence**: Defined via JSON Schema Draft 2020-12 for complete language portability across TypeScript, Python, Go, and Java.

---

## 2. Architecture & Data Flow

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                       INPUTS                                            │
│  ┌───────────────────────────┐  ┌─────────────────────────────────┐  ┌────────────────┐  │
│  │   Taxpayer JSON Payload   │  │ Tax Form Annotation Spec JSON   │  │   Blank PDF    │  │
│  │          (DATA)           │  │             (SPEC)              │  │ Form Template  │  │
│  └─────────────┬─────────────┘  └────────────────┬────────────────┘  └───────┬────────┘  │
└────────────────┼─────────────────────────────────┼───────────────────────────┼──────────┘
                 │                                 │                           │
                 ▼                                 ▼                           │
┌────────────────┼─────────────────────────────────┼───────────────────────────┼──────────┐
│ CORE ENGINE    │                                 │                           │          │
│                ▼                                 ▼                           │          │
│       ┌─────────────────┐               ┌───────────────────┐                │          │
│       │ Path Resolver   │               │ Zod Runtime       │                │          │
│       │ (PR)            │               │ Validator (V)     │                │          │
│       └────────┬────────┘               └─────────┬─────────┘                │          │
│                │                                  │                          │          │
│                ▼ (Extract Raw Value)              ▼ (Validated Spec)         │          │
│       ┌─────────────────┐               ┌───────────────────┐                │          │
│       │ Tax Formatter   │               │ Tax Form Engine   │                │          │
│       │ (TF)            │               │ (E)               │                │          │
│       └────────┬────────┘               └─────────┬─────────┘                │          │
│                │                                  │                          │          │
│                └────────────────┬─────────────────┘                          │          │
│                                 │                                            │          │
│                                 ▼                                            │          │
│                       ┌───────────────────┐                                  │          │
│                       │ Geometry Engine   │                                  │          │
│                       │ (GE)              │                                  │          │
│                       └─────────┬─────────┘                                  │          │
│                                 │                                            │          │
│        ┌────────────────────────┼────────────────────────┐                   │          │
│        │            │           │            │           │                   │          │
│        ▼            ▼           ▼            ▼           ▼                   │          │
│   ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌───────────┐        │          │
│   │SINGLE_BOX│ │MULTI_LINE│ │CHARACTER  │ │SUBFIELD  │ │OVERFLOW   │        │          │
│   │          │ │_WRAP     │ │_SLICE     │ │_MAPPING  │ │_CHAIN     │        │          │
│   └────┬─────┘ └────┬─────┘ └─────┬─────┘ └────┬─────┘ └─────┬─────┘        │          │
│        │            │           │            │           │                  │          │
└────────┼────────────┼───────────┼────────────┼───────────┼──────────────────┼──────────┘
         │            │           │            │           │                  │
         └────────────┴─────┬─────┴────────────┴───────────┘                  │
                            │                                                 │
                            ▼                                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ OUTPUT                    │                                                 │           │
│                           ▼                                                 ▼           │
│              ┌─────────────────────────────────┐                   ┌────────────────┐   │
│              │   PDF-Lib Overlay Renderer      │◄──────────────────│ Blank PDF Form │   │
│              │            (RENDER)             │                   │     (PDF)      │   │
│              └────────────────┬────────────────┘                   └────────────────┘   │
│                               │                                                         │
│                               ▼                                                         │
│              ┌─────────────────────────────────┐                                        │
│              │   Pixel-Perfect Filled PDF      │                                        │
│              │            (OUT)                │                                        │
│              └─────────────────────────────────┘                                        │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Data Structure Model

```text
┌──────────────────────────────────────────┐          ┌──────────────────────────────────┐
│           TaxFormAnnotation              │          │             PageSize             │
├──────────────────────────────────────────┤          ├──────────────────────────────────┤
│ +string formId                           │ 1      1 │ +float width                     │
│ +string formName                         ├──────────┤ +float height                    │
│ +int taxYear                             │          │ +MeasurementUnit unit            │
│ +string revision                         │          │ +CoordinateOrigin coordinateOrigin│
│ +FormJurisdiction jurisdiction           │          └──────────────────────────────────┘
│ +int pageCount                           │
│ +PageSize pageSize                       │
│ +GlobalStyling globalStyling             │
│ +TaxFormField[] fields                   │ 1
└────────────────────┬─────────────────────┘
                     │
                     │ 1..*
                     ▼
┌──────────────────────────────────────────┐
│              TaxFormField                │
├──────────────────────────────────────────┤
│ +string id                               │
│ +string label                            │
│ +FieldType type                          │
│ +string dataPath                         │
│ +any fallbackValue                       │
│ +LayoutStrategy layoutStrategy           │
│ +FieldFormatConfig format                │
│ +GeometryTarget[] bounds                 │
│ +SubfieldMapping[] subfields             │
└────────────────────┬─────────────────────┘
                     │
                     │ 1..*
                     ▼
┌──────────────────────────────────────────┐
│             GeometryTarget               │
├──────────────────────────────────────────┤
│ +int pageIndex                           │
│ +BoundingBox box                         │
│ +CombConfig comb                         │
│ +int maxCharacters                       │
│ +int[] characterRange                    │
│ +string subfieldKey                      │
│ +TextAlignment align                     │
│ +float fontSize                          │
│ +bool autoShrinkToFit                    │
└──────────────────────────────────────────┘
```

---

## 4. Layout Strategies & Geometry Rules

IRS tax forms rarely place inputs inside simple single boxes. Fields split across physical boxes, comb grids, or wrapped lines. The specification handles this using five layout strategies within `bounds: GeometryTarget[]`.

### Strategy 1: `CHARACTER_SLICE` (Segmented Comb Boxes)
* **Analogy**: Like filling out a crossword grid where each square holds exactly one character.
* **Use Case**: SSNs and EINs split into `3-2-4` boxes separated by printed dashes: `[___] - [__] - [____]`.
* **Behavior**: The engine partitions the raw string using character ranges (`[0, 3]`, `[3, 5]`, `[5, 9]`) and centers each character inside its individual comb cell.

$$\text{cellX} = x_{\text{box}} + i \cdot (\text{width}_{\text{cell}} + \text{spacing}) + \frac{\text{width}_{\text{cell}} - \text{width}_{\text{char}}}{2}$$

```text
                     ┌───────────────────────────────────────┐
                     │        SSN Raw: "123456789"           │
                     └───────────────────┬───────────────────┘
                                         │
            ┌────────────────────────────┼────────────────────────────┐
            │                            │                            │
            ▼                            ▼                            ▼
┌───────────────────────┐    ┌───────────────────────┐    ┌───────────────────────┐
│ Target 1 (Range 0-3)  │    │ Target 2 (Range 3-5)  │    │ Target 3 (Range 5-9)  │
│ Comb: 3 cells         │    │ Comb: 2 cells         │    │ Comb: 4 cells         │
│ [ 1 ][ 2 ][ 3 ]       │    │ [ 4 ][ 5 ]            │    │ [ 6 ][ 7 ][ 8 ][ 9 ]  │
└───────────────────────┘    └───────────────────────┘    └───────────────────────┘
```

### Strategy 2: `MULTI_LINE_WRAP` (Disjoint Text Wrap)
* **Analogy**: Like pouring water from a pitcher into a set of connected glasses—when the first fills up, the rest flows into the next glass.
* **Use Case**: Street addresses or legal descriptions that span multiple separate physical lines on the tax form.
* **Behavior**: Text fills Box 1 up to `maxCharacters` on word boundaries, then flows into Box 2, Box 3, etc.

### Strategy 3: `SUBFIELD_MAPPING` (Composite Data Splitting)
* **Analogy**: Taking a combined timestamp like `2026-04-14T15:45:00Z` and putting the date on the front door and the time on the back door.
* **Use Case**: E-signature blocks requiring Date (`04/14/2026`) and Time (`03:45 PM`) in separate boxes on the page.
* **Behavior**: Evaluates transforms (`DATE_PART`, `TIME_PART`) and routes each value to the matching `GeometryTarget.subfieldKey`.

### Strategy 4: `OVERFLOW_CHAIN` (Continuation Overflow)
* **Analogy**: Overflow parking—when the main parking lot is full, cars park in the auxiliary lot.
* **Use Case**: Text or line items exceeding primary form box boundaries.
* **Behavior**: Excess characters flow into secondary memo boxes or trigger a standardized continuation schedule attachment.

### Strategy 5: `SINGLE_BOX` (Standard Input)
* **Analogy**: A standard name tag sticker.
* **Use Case**: Single-line text, currency amounts, or checkboxes with alignment (`LEFT`, `CENTER`, `RIGHT`) and auto-shrink typography.

---

## 5. Data Path Resolution Rules

Taxpayer data uses structured nested JSON. The path resolver extracts values using three lookup rules:

| Rule | Syntax Example | Behavior |
| :--- | :--- | :--- |
| **Dot Navigation** | `taxpayer.primary.identity.ssn` | Navigates nested object properties. |
| **Array Indexing** | `taxpayer.dependents[0].firstName` | Accesses specific array elements by 0-based index. |
| **Filter Query** | `income.schedules[?(@.type=="C")].netProfit` | Matches array items by property value filter. |
| **Fallback Handling** | `fallbackValue: "0.00"` | Returns default value when path is null or undefined. |

---

## 6. IRS Tax Formatting Pipeline

```text
                      ┌─────────────────────────────┐
                      │      Raw Input Data         │
                      └──────────────┬──────────────┘
                                     │
                                     ▼
                      ┌─────────────────────────────┐
                      │         Field Type          │
                      └──────────────┬──────────────┘
                                     │
       ┌─────────────────┬───────────┴───────────┬─────────────────┬─────────────────┐
       │                 │                       │                 │                 │
       ▼                 ▼                       ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐        ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   CURRENCY   │  │     SSN      │        │     EIN      │  │     DATE     │  │BOOLEAN_CHECK │
│ Whole dollar │  │ Dashed /     │        │ Dashed       │  │ MM/DD/YYYY   │  │ 'X', '✓',    │
│ (1,234)      │  │ Masked       │        │ (12-3456789) │  │ custom fmt   │  │ solid box    │
└──────────────┘  └──────────────┘        └──────────────┘  └──────────────┘  └──────────────┘
```

---

## 7. Complete Specification Schema Example

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "formId": "IRS-1040",
  "formName": "U.S. Individual Income Tax Return",
  "taxYear": 2025,
  "revision": "Rev. December 2025",
  "pageCount": 2,
  "pageSize": {
    "width": 612,
    "height": 792,
    "unit": "pt",
    "coordinateOrigin": "TOP_LEFT"
  },
  "fields": [
    {
      "id": "f1040_primary_ssn",
      "label": "Your social security number",
      "type": "SSN",
      "dataPath": "taxpayer.primary.identity.ssn",
      "layoutStrategy": "CHARACTER_SLICE",
      "format": { "ssn": { "format": "RAW" } },
      "bounds": [
        {
          "pageIndex": 0,
          "characterRange": [0, 3],
          "box": { "x": 440, "y": 95, "width": 36, "height": 14 },
          "comb": { "enabled": true, "cellCount": 3 }
        },
        {
          "pageIndex": 0,
          "characterRange": [3, 5],
          "box": { "x": 484, "y": 95, "width": 24, "height": 14 },
          "comb": { "enabled": true, "cellCount": 2 }
        },
        {
          "pageIndex": 0,
          "characterRange": [5, 9],
          "box": { "x": 516, "y": 95, "width": 48, "height": 14 },
          "comb": { "enabled": true, "cellCount": 4 }
        }
      ]
    }
  ]
}
```
