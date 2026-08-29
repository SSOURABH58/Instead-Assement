# Instead Tax Form Annotation System & Reference Engine

**Submitted by:** Sourabh Soni  
**Target Role:** Technical Assessment Submission - Instead Engineering Team  
**Tech Stack:** TypeScript 5.5, Zod, JSON Schema (Draft 2020-12), `pdf-lib`, Vitest

---

## 📌 Executive Overview

The **Instead Tax Form Annotation System** is an extensible data structure specification and pure TypeScript reference engine designed to annotate, format, and print deeply nested taxpayer data onto U.S. tax forms (e.g. IRS Form 1040 and Form W-2).

It bridges the gap between normalized taxpayer database payloads and the visual print layouts required by physical tax return forms.

---

## 📖 Core Documentation & Architecture Deep-Dives

* 📐 **[Specification (`docs/SPECIFICATION.md`)](docs/SPECIFICATION.md)**  
  Complete data contract covering schema fields, 5 multi-shape layout strategies, comb box formulas, and nested data path rules.
* 🏛️ **[Architecture & Design Decisions (`docs/DESIGN_DECISIONS.md`)](docs/DESIGN_DECISIONS.md)**  
  Engineering trade-offs, Top-Left vs. Bottom-Left coordinate transformation, decoupling visual layouts from schemas, and pure TS vs. Puppeteer benchmarks.
* 🚀 **[Future Roadmap (`docs/FUTURE_ENHANCEMENTS.md`)](docs/FUTURE_ENHANCEMENTS.md)**  
  Vision for Visual Drag-and-Drop Annotation Studio, OCR box detection, IRS MeF XML synchronization, and browser-side PDF rendering.

---

## 🔬 Domain Research Summary

| Research Area | Findings & Engineering Approach |
| :--- | :--- |
| **Multi-Shape Form Geometry** | IRS forms break simple 1-to-1 box models. Designed 5 layout strategies (`CHARACTER_SLICE` for 3-2-4 SSN comb boxes, `MULTI_LINE_WRAP` for non-contiguous address lines, `SUBFIELD_MAPPING` for split ISO timestamps). |
| **Data Path Resolution** | Taxpayer payloads are deeply structured. Built a path resolver supporting dot notation, array indexing (`dependents[0]`), and JSONPath filter predicates (`schedules[?(@.type=="C")].netProfit`). |
| **IRS Formatting Rules** | Implemented dedicated formatting pipeline for currency (whole-dollar rounding, `(1,234)` parentheses), SSNs/EINs, dates, and auto-shrink font sizing. |
| **PDF Engine Performance** | Evaluated Puppeteer vs. native C++ vs. `pdf-lib`. Selected `pdf-lib` for zero external binary dependencies, microsecond overlay rendering (<50ms), and 100% serverless worker portability. |

---

## ⚡ Quick Start & Verification Footer

```bash
# 1. Install dependencies
npm install

# 2. Run test suite (19 passing unit & integration tests)
npm test

# 3. Generate filled sample PDFs (Output: output/form-1040-filled.pdf & output/form-w2-filled.pdf)
npm run generate:all

# 4. Inspect form annotations & resolved data paths
npx tsx src/cli.ts inspect --form forms/form-1040/form-1040.annotation.json --data forms/form-1040/sample-data.json
```
