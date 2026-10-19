# SG Biodiversity Accounting Metric: interactive edition

An interactive web version of the three spreadsheets published with the
[Singapore Biodiversity Accounting Metric 1.1](https://anz.planengage.com/singapore-bio-metric/page/SG-Bio-Accounting-Metric-10):

| Spreadsheet | Web app view |
|---|---|
| **SG BA Metric 1.1 Tool** (baseline, creation and enhancement sheets for terrestrial, freshwater and marine habitats, plus RESULTS) | **Metric calculator** |
| **Terrestrial Habitat Condition Criteria 1.1** (15 habitat sheets) | **Terrestrial condition** |
| **Freshwater Habitat Condition Criteria 1.1** (15 habitat sheets) | **Freshwater condition** |

The app also includes a **Habitat guide** (all 42 habitat types with their distinctiveness scores, creation and enhancement difficulty, time to target condition and compensation rules) and a **How it works** page that summarises the handbook, with four case-study examples that load into the calculator.

## Features

- Live calculation as you type, with per-parcel feedback: distinctiveness, condition, time to target, difficulty multiplier, trading-down and "not possible" warnings, and area errors.
- The enhancement step lists only the changes the metric's time-to-target table allows.
- From any baseline parcel, **Assess condition** opens that habitat's criteria sheet and applies the resulting Good, Moderate or Poor rating.
- Results for each ecosystem: units, net change, % change, the units still needed for no net loss or a 10% net gain, the RESULTS-sheet area error check, and compensation requirements for habitats lost.
- **Export & share**: PNG result card (1200×630 landscape or 1080×1080 for Instagram), copy image, CSV, print/PDF, the native share sheet on mobile (Instagram, Threads, WhatsApp…), and share links for Facebook, LinkedIn, X, Threads, WhatsApp, Telegram, Reddit and email.
- **Nothing is saved.** No storage, no backend. A share link carries your inputs only if you tick the option, and then only inside the link itself.
- Responsive, with light and dark themes. No build step and no framework; html2canvas loads from cdnjs for image export.

## Run locally

```bash
npm start          # python3 -m http.server 8000, then open http://localhost:8000
npm test           # engine unit tests and Excel-parity fixtures (Node 18+)
```

Opening `index.html` directly from disk also works.

## Deploy

`.github/workflows/pages.yml` runs the tests and publishes the site to GitHub Pages on every push to `main`. Enable it under **Settings → Pages → Build and deployment → Source: GitHub Actions**. Any static host works too: upload `index.html` and `assets/`.

## Project layout

```
index.html                 app shell
assets/css/app.css         styles (light and dark)
assets/js/data.js          GENERATED lookup tables and condition criteria
assets/js/engine.js        pure calculation engine (browser and Node)
assets/js/calculator.js    metric calculator view
assets/js/condition.js     condition assessment component
assets/js/guide.js         habitat guide
assets/js/learn.js         handbook summary and case studies
assets/js/share.js         image export and social sharing
assets/js/presets.js       example scenarios from the handbook and case studies
scripts/build_data.py      extracts data.js from the three official .xlsx files
scripts/excel-parity/      recalculates random scenarios in the official workbook to compare
tests/                     node:test suite and parity fixtures
```

### Regenerating the data

Download the three workbooks from the official page, then run:

```bash
pip install openpyxl
python3 scripts/build_data.py "SG Biodiversity Accounting Metric 1.1 DevV01.xlsx" \
  SGBA_1.1_Terrestrial_Condition_Criteria.xlsx SGBA_1.1_Freshwater_Condition_Criteria.xlsx
```

## Fidelity to the Excel tool

`engine.js` ports the workbook formulas directly. `scripts/excel-parity` writes random assessments into the official workbook, recalculates them with LibreOffice, and compares the results:

```bash
python3 scripts/excel-parity/generate.py METRIC.xlsx work 40
soffice --headless --calc --convert-to xlsx --outdir work/out work/in/*.xlsx
python3 scripts/excel-parity/collect.py work
node scripts/excel-parity/compare.js work
```

Across 40 random assessments (360 checks of baseline units, post-development units and the area check), 321 matched exactly. The other 39 differ only where the workbook has its own lookup errors, which this edition does not reproduce:

1. **Terrestrial enhancement multiplier**: most rows of `A3 Enhancement - Terrestrial` use `VLOOKUP($H$8, …)`, so every row takes row 8's proposed habitat (or errors when row 8 is empty). Here each row uses its own habitat.
2. **Marine enhancement multiplier**: in `C3 Enhancement - Marine`, the lookup range `FH7:FJ42` ends at mudflats, so rocky shore, artificial marine structures, sandy beach, lower reef, deep zone and soft-sediment seabed return *Error* (0 units). Here the published multipliers are used.
3. **Mangrove forest** appears in both the freshwater and marine lists. Excel's first-match lookup gives marine mangroves the freshwater enhancement multiplier (0.75 rather than 0.67). Here each ecosystem uses its own.
4. **Forest or rural river** and **Naturalised river** are missing from the enhancement time-to-target table (`Z8 TARGET ENH`). Excel returns `#N/A`, which breaks the freshwater total. Here the row is flagged and scores 0; record it as loss plus creation.

The enhancement formula in the workbook is `A·Dnew·Cnew − A·Dold·Cold·m + A·Dold·Cold`. This applies the difficulty multiplier to the *old* units, so harder enhancements earn *more* units, the opposite of what the handbook describes. The app uses the workbook formula by default. **Results › Calculation settings** switches to `A·Dold·Cold + (A·Dnew·Cnew − A·Dold·Cold)·m`.

## Credits

All metric logic, habitat data and condition criteria: AECOM & Camphora (2024). *Singapore Biodiversity Accounting Metric: Version 1.1.* Available at <http://anz.planengage.com/singapore-bio-metric>. This is an independent interactive edition. It does not replace the official tool or expert ecological advice.
