# Instead Tax Form Annotation System & Reference Engine

**Submitted by:** Sourabh Soni  
**Target Role:** Technical Assessment Submission - Instead Engineering Team  

---

## Assumptions

Since the technical assessment description was open-ended, we made 4 simple assumptions:

* **PDF Overlays**: We print text directly on top of blank PDF pages instead of using fillable form fields.
* **Top-Left Coordinates**: We measure box locations starting from the top-left corner of the page so it is easy to layout.
* **Multi-Box Fields**: A single piece of data (like an SSN or address) can split and print across multiple boxes.
* **Nested Data & Database Agnosticism**: Taxpayer details are provided as nested objects (serialized as JSON or projected from SQL/NoSQL databases), which map to form boxes via key path resolution.

---

## Documentation

* ### **[Specification](docs/SPECIFICATION.md)**
* ### **[Prototype Architecture & Design Decisions](docs/DESIGN_DECISIONS.md)**
* ### **[Current State & Future Enhancements](docs/FUTURE_ENHANCEMENTS.md)**

---

## Quick Start

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


