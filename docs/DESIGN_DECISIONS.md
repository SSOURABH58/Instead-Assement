# Architecture & Design Decisions

This document details the core architectural decisions, engineering trade-offs, and rationale behind the **Tax Form Annotation Specification & Engine**.

---

## 1. Multi-Shape Geometry vs. 1-to-1 Rectangles

### Problem
Traditional PDF tools assume 1 field maps to 1 rectangle. IRS tax forms break this assumption everywhere:
* **Segmented Comb Boxes**: An SSN is split into three boxes across printed dashes `[___] - [__] - [____]`.
* **Multi-Line Wrapping**: Addresses span separate physical lines interrupted by form borders or section labels.
* **Composite Field Splitting**: An e-signature timestamp must print Date in Box A and Time in Box B.

### Decision
Model field coordinates as an array of `GeometryTarget` objects driven by explicit **Layout Strategies**:
1. `CHARACTER_SLICE`: Slices strings into character ranges (`[0,3]`, `[3,5]`, `[5,9]`) and aligns individual characters inside comb cells.
2. `MULTI_LINE_WRAP`: Flows text across non-contiguous physical boxes with automatic word wrapping.
3. `SUBFIELD_MAPPING`: Splits structured data (e.g. ISO timestamps) into subcomponents (`DATE_PART`, `TIME_PART`) mapped to distinct shape keys.
4. `OVERFLOW_CHAIN`: Directs overflow text into secondary memo boxes or continuation schedules.

### Trade-off
Slightly larger JSON annotation payloads in exchange for 100% layout fidelity on real IRS forms without writing custom code for every form.

---

## 2. Decoupling Visual Layout from Data Schemas

### Problem
Tax platforms maintain normalized database schemas (e.g. `taxpayer.dependents[0].identity.ssn`), while tax forms are flat visual print layouts. Hardcoding database fields directly to coordinate boxes creates brittle code that breaks every tax year revision.

### Decision
Build a **Declarative Path Resolver** supporting:
* Dot and bracket property access (`taxpayer.primary.firstName`).
* Predicate filter queries (`schedules[?(@.type=="C")].netProfit`).
* Dynamic fallbacks when values are missing.
* Conditional rendering conditions (`filing.status === 'MARRIED_FILING_JOINTLY'`).

### Benefits
* Tax analysts or visual tools can update form coordinate templates without changing backend code.
* Multiple form revisions (e.g. Form 1040 for 2024 vs 2025) bind to the exact same taxpayer JSON payload.

---

## 3. Top-Left Origin Coordinate Transformation

### Problem
PDF files use a Cartesian coordinate system with `(0,0)` at the **Bottom-Left** corner (Y-axis points up). Web tools, Figma, SVG, and HTML Canvas use `(0,0)` at the **Top-Left** corner (Y-axis points down).

### Decision
Use `coordinateOrigin: "TOP_LEFT"` as the default standard in the annotation schema, and perform mathematical origin translation inside the engine at render time:

$$y_{\text{pdf}} = y_{\text{page}} - y_{\text{top}} - h_{\text{box}}$$

We standardize unit measurements to PDF PostScript points ($1\text{ pt} = 1/72\text{ inch}$).

### Benefits
Engineers and tax analysts can inspect coordinates using web browsers and screen measurement tools without manual math.

---

## 4. Pure TypeScript PDF Engine (`pdf-lib`) vs. Headless Chrome

### Problem
PDF rendering engines that rely on headless browsers (Puppeteer/Playwright) or native C++ binaries (Poppler/Ghostscript) suffer from:
* Heavy container images (+500MB).
* Cold-start latency (1-3 seconds per PDF).
* Deployment constraints on serverless edge workers (Cloudflare Workers, AWS Lambda).

### Decision
Build the reference engine entirely in pure TypeScript using `pdf-lib`:
* **Zero Native Binaries**: Pure JavaScript/TypeScript runtime.
* **Sub-50ms Overlays**: Generates multi-page filled PDFs in under 50 milliseconds.
* **Universal Portability**: Runs identically in Node.js, AWS Lambda, edge functions, and client-side web browsers.

---

## 5. IRS Tax Formatting Pipeline Architecture

### Problem
IRS presentation guidelines mandate strict formatting rules:
* Currency rounded to whole dollars with accounting negative parentheses `(1,234)`.
* SSN/EIN dashing (`123-45-6789`) or security masking (`***-**-6789`).
* Checkbox styles (`X`, `✓`, filled box).

### Decision
Isolate formatting rules into a dedicated `TaxFormatter` pipeline. Raw data values pass through type-specific transformers before geometry calculation, ensuring clean separation between data parsing, text formatting, and coordinate layout.
