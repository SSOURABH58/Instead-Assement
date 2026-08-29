# Future Enhancements & Vision Roadmap

This document outlines future engineering enhancements to scale the **Tax Form Annotation Platform** across thousands of federal, state, and municipal tax forms.

```text
┌─────────────────────────────────────────────────────────────────┐
│                        VISION ROADMAP                           │
│  ┌────────────────────┐  ┌───────────────────────────────────┐  │
│  │ 1. Visual Studio   │  │ 2. OCR Box Auto-Detection         │  │
│  └────────────────────┘  └───────────────────────────────────┘  │
│  ┌────────────────────┐  ┌───────────────────────────────────┐  │
│  │ 3. IRS MeF Sync    │  │ 4. Differential Form Migration    │  │
│  └────────────────────┘  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 5. Client-Side Browser WebAssembly Engine                 │  │
│  └───────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
                ┌─────────────────────────────────┐
                │   ENTERPRISE TAX PLATFORM       │
                └─────────────────────────────────┘
```

---

## 1. Visual Drag-and-Drop Annotation Studio (WYSIWYG)
* **Goal**: Enable tax analysts to annotate PDF tax forms visually without typing raw JSON coordinates.
* **Key Features**:
  * Drag-and-drop bounding box creation with pixel grid snapping.
  * Specialized comb-box generator with slider controls for cell counts and gaps.
  * Real-time preview panel displaying formatted taxpayer data directly on PDF pages.
  * One-click export to standard `tax-form-annotation.json` files.

---

## 2. OCR & Computer Vision Box Auto-Detection
* **Goal**: Automate form template creation using layout analysis (LayoutLM / Computer Vision).
* **Key Features**:
  * Automatic detection of rectangular input fields, segmented comb boxes, and checkbox grids on blank IRS PDFs.
  * Extraction of printed form labels (e.g., "1a Total wages", "Filing Status") to auto-assign field IDs and placeholder data paths.

---

## 3. IRS Modernized e-File (MeF) XML Synchronization
* **Goal**: Synchronize visual PDF output with electronic filing (e-file) data pipelines.
* **Key Features**:
  * Bi-directional mapping between visual annotation JSON and IRS MeF XML schemas.
  * Automated validation ensuring printed PDF values match transmitted e-file XML payloads.

---

## 4. Differential Form Revision Migration Tool
* **Goal**: Upgrade form annotations automatically when IRS releases annual PDF revisions (e.g. 2024 $\rightarrow$ 2025).
* **Key Features**:
  * Visual diff engine comparing old and new PDF template releases.
  * Automated adjustment of coordinate bounding boxes for shifted line items while preserving underlying data paths.

---

## 5. Client-Side Browser PDF Generation
* **Goal**: Enable zero-server, privacy-first PDF rendering directly on client devices.
* **Key Features**:
  * Complete browser-side execution of the pure TypeScript engine via WebAssembly or client-side bundles.
  * Zero server transmission of sensitive taxpayer data during preview and download flows.
