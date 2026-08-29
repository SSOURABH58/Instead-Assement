#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { TaxFormEngine } from './engine/index.js';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    printHelp();
    process.exit(0);
  }

  const getArg = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
  };

  if (command === 'validate') {
    const formPath = getArg('--form') || getArg('-f');
    if (!formPath) {
      console.error('Error: --form <path> is required for validate command');
      process.exit(1);
    }

    const formJson = JSON.parse(fs.readFileSync(path.resolve(formPath), 'utf-8'));
    const validation = TaxFormEngine.validateAnnotation(formJson);

    if (validation.valid) {
      console.log(`✅ Form Annotation Specification is VALID: ${formJson.formId} (${formJson.formName})`);
      console.log(`   Fields Defined: ${formJson.fields?.length || 0}`);
      console.log(`   Page Count: ${formJson.pageCount}`);
    } else {
      console.error(`❌ Validation Failed with ${validation.errors?.length} errors:`);
      validation.errors?.forEach((err) => console.error(`   - ${err}`));
      process.exit(1);
    }
  } else if (command === 'inspect') {
    const formPath = getArg('--form') || getArg('-f');
    const dataPath = getArg('--data') || getArg('-d');

    if (!formPath || !dataPath) {
      console.error('Error: --form and --data arguments are required for inspect command');
      process.exit(1);
    }

    const formJson = JSON.parse(fs.readFileSync(path.resolve(formPath), 'utf-8'));
    const taxpayerData = JSON.parse(fs.readFileSync(path.resolve(dataPath), 'utf-8'));

    const validation = TaxFormEngine.validateAnnotation(formJson);
    if (!validation.valid || !validation.data) {
      console.error('Invalid form annotation:', validation.errors);
      process.exit(1);
    }

    const { fieldValues } = TaxFormEngine.processForm(validation.data, taxpayerData);

    console.log(`\n=== INSPECTION REPORT: ${formJson.formId} ===`);
    console.log(`Taxpayer: ${taxpayerData?.taxpayer?.primary?.firstName || 'N/A'} ${taxpayerData?.taxpayer?.primary?.lastName || ''}`);
    console.log(`Total Fields Annotated: ${validation.data.fields.length}\n`);

    for (const fv of fieldValues) {
      console.log(`Field [${fv.fieldId}]: "${fv.label}"`);
      console.log(`  Path: ${fv.dataPath}`);
      console.log(`  Raw Value: ${JSON.stringify(fv.rawValue)}`);
      console.log(`  Rendered Elements (${fv.renderedElements.length} shape segments):`);
      for (const elem of fv.renderedElements) {
        console.log(`    -> [Page ${elem.pageIndex + 1}] Text: "${elem.text}" @ (X: ${elem.x.toFixed(1)}, Y: ${elem.y.toFixed(1)}) Font: ${elem.fontSize}pt ${elem.fontFamily}`);
      }
      console.log('');
    }
  } else if (command === 'render') {
    const formPath = getArg('--form') || getArg('-f');
    const dataPath = getArg('--data') || getArg('-d');
    const templatePath = getArg('--template') || getArg('-t');
    const outPath = getArg('--out') || getArg('-o') || 'output/tax-form-rendered.pdf';

    if (!formPath || !dataPath) {
      console.error('Error: --form and --data arguments are required for render command');
      process.exit(1);
    }

    const formJson = JSON.parse(fs.readFileSync(path.resolve(formPath), 'utf-8'));
    const taxpayerData = JSON.parse(fs.readFileSync(path.resolve(dataPath), 'utf-8'));

    const validation = TaxFormEngine.validateAnnotation(formJson);
    if (!validation.valid || !validation.data) {
      console.error('Invalid form annotation specification:', validation.errors);
      process.exit(1);
    }

    let templateBuffer: Buffer | undefined;
    if (templatePath && fs.existsSync(templatePath)) {
      templateBuffer = fs.readFileSync(path.resolve(templatePath));
    }

    console.log(`Rendering ${formJson.formId} (${formJson.formName})...`);
    const startTime = Date.now();

    const pdfBytes = await TaxFormEngine.renderToPdf(validation.data, taxpayerData, {
      templatePdfBuffer: templateBuffer,
    });

    const resolvedOut = path.resolve(outPath);
    fs.mkdirSync(path.dirname(resolvedOut), { recursive: true });
    fs.writeFileSync(resolvedOut, Buffer.from(pdfBytes));

    const duration = Date.now() - startTime;
    console.log(`✅ Successfully generated PDF in ${duration}ms!`);
    console.log(`   Output file: ${resolvedOut}`);
    console.log(`   File size: ${(pdfBytes.byteLength / 1024).toFixed(1)} KB`);
  } else {
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
U.S. Tax Form Annotation CLI & Overlay Engine

Usage:
  tax-render render --form <path> --data <path> [--template <path>] [--out <path>]
  tax-render validate --form <path>
  tax-render inspect --form <path> --data <path>

Options:
  --form, -f      Path to the tax form annotation JSON specification
  --data, -d      Path to the deeply nested taxpayer JSON payload
  --template, -t  Optional path to the blank PDF form template
  --out, -o       Output PDF path (default: output/tax-form-rendered.pdf)
  --help, -h      Show this help menu
`);
}

main().catch((err) => {
  console.error('Unhandled CLI Error:', err);
  process.exit(1);
});
