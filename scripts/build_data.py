#!/usr/bin/env python3
"""Extract lookup tables from the SG Biodiversity Accounting Metric 1.1 workbooks.

Usage:
    python3 scripts/build_data.py METRIC.xlsx TERRESTRIAL_CRITERIA.xlsx FRESHWATER_CRITERIA.xlsx

Writes assets/js/data.js. The workbooks are published by AECOM & Camphora at
https://anz.planengage.com/singapore-bio-metric/page/SG-Bio-Accounting-Metric-10
"""
import json
import re
import sys
from pathlib import Path

import openpyxl
from openpyxl.utils import column_index_from_string as col

OUT = Path(__file__).resolve().parent.parent / "assets" / "js" / "data.js"

# Criteria sheet name -> habitat name used in the metric workbook
CRITERIA_TO_HABITAT = {
    "Primary forest": "Lowland dipterocarp primary forest",
    "Native-dom sec forest": "Native dominated secondary forest",
    "Coastal forest": "Coastal forest",
    "Abandoned-land forest": "Abandoned land forest",
    "Scrubland-Grassland": "Scrubland / Grassland",
    "Casuarina-dom coastal forest": "Causarina-dominated coastal forest",
    "Exotic-dom sec forest": "Exotic-dominated secondary forest",
    "Vertical greenery": "Outdoor vertical greenery",
    "Streetscape": "Streetscape",
    "Urban park garden": "Urban park/garden",
    "Community farm": "Outdoor community farm",
    "Commercial farm": "Outdoor commercial farm",
    "Golf course": "Golf course",
    "Turf": "Turf",
    "Skyrise Greenery": "Outdoor rooftop greenery",
    "Freshwater swamp forest": "Freshwater swamp forest",
    "Hill stream": "Hill stream",
    "Mangrove forest": "Mangrove forest",
    "Forest or rural stream": "Forest or rural stream",
    "Forest or rural river": "Forest or rural river",
    "Unmanaged soft-bank pond": "Unmanaged soft bank pond",
    "Managed soft-bank pond": "Managed soft bank pond",
    "Hard-bank pond": "Hard bank pond",
    "Quarry lake": "Quarry lake",
    "Reservoir": "Reservoir",
    "Naturalised river": "Naturalised river",
    "Freshwater marsh": "Freshwater marsh",
    "Naturalised stream": "Naturalised stream",
    "Concrete drain": "Concrete drain / canal",
    "Rain garden, swale, biotope": "Rain garden, swale, biotope",
}

ECO_KEY = {"Terrestrial": "terrestrial", "Freshwater": "freshwater", "Marine": "marine"}


def clean(s):
    if s is None:
        return ""
    s = str(s).replace("\r", "")
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\n\s*\n+", "\n", s)
    return s.strip()


def num_or_text(v):
    if isinstance(v, float) and v.is_integer():
        return int(v)
    return v


def metric_tables(path):
    wb = openpyxl.load_workbook(path, data_only=True)
    z1, z2 = wb["Z1 HAB CLASS"], wb["Z2 DISTINCTIVENESS"]
    z7, z8 = wb["Z7 TARGET CREATION"], wb["Z8 TARGET ENH"]

    habitats = []
    eco = broad = hab = None
    for r in range(4, 46):
        if z1.cell(r, 1).value:
            eco, broad, hab = z1.cell(r, 1).value, None, None
        broad = z1.cell(r, 2).value or broad
        hab = z1.cell(r, 3).value or hab
        name = z1.cell(r, 4).value
        zr = r - 1  # Z7 rows are offset by one from Z1
        assert z7.cell(zr, 7).value == name, (name, z7.cell(zr, 7).value)
        assert z8.cell(r + 3, col("FH")).value == name, name
        habitats.append({
            "id": f"{ECO_KEY[eco]}:{name}",
            "eco": ECO_KEY[eco],
            "broad": clean(broad),
            "group": clean(hab),
            "name": name,
            "category": z1.cell(r, 5).value,
            "criteriaTotal": z1.cell(r, 6).value,
            "criteriaScores": [z2.cell(r + 22, c).value for c in range(3, 7)],
            "definition": clean(z1.cell(r, 7).value),
            "trading": clean(z1.cell(r, 8).value),
            "createYears": {k: num_or_text(z7.cell(zr, c).value) for k, c in zip(["Good", "Moderate", "Poor"], range(3, 6))},
            "createMultiplier": num_or_text(z7.cell(zr, 8).value),
            "createDifficulty": z7.cell(zr, 9).value,
            "enhanceMultiplier": num_or_text(z8.cell(r + 3, col("FI")).value),
            "enhanceDifficulty": z8.cell(r + 3, col("FJ")).value,
        })

    # Enhancement time-to-target matrix: "HABITAT/COND" -> {"HABITAT/COND": years}
    cols, rows = {}, {}
    for c in range(6, col("FE") + 1):
        k = z8.cell(2, c).value
        if k and k.upper() not in cols:  # Excel MATCH returns the first hit
            cols[k.upper()] = c
    for r in range(6, 162):
        k = z8.cell(r, 2).value
        if k and k.upper() not in rows:
            rows[k.upper()] = r
    enhance = {}
    covered = sorted({k.rsplit("/", 1)[0] for k in rows} & {k.rsplit("/", 1)[0] for k in cols})
    for rk, r in rows.items():
        options = {}
        for ck, c in cols.items():
            v = z8.cell(r, c).value
            if v is not None and v != "Not possible":
                options[ck] = num_or_text(v)
        if options:
            enhance[rk] = options

    categories = []
    for r in range(5, 12):
        categories.append({
            "name": clean(z2.cell(r, 1).value),
            "description": clean(z2.cell(r, 2).value),
            "scoreRange": clean(z2.cell(r, 6).value),
            "action": clean(z2.cell(r, 7).value),
        })
    values = {}
    for r in range(16, 23):
        values[z2.cell(r, 8).value] = z2.cell(r, 11).value
    trading = {}
    for r in range(4, 11):
        trading[z1.cell(r, 12).value.capitalize() if r < 10 else "No value"] = clean(z1.cell(r, 14).value)
    criteria = []
    for r in range(16, 20):
        criteria.append({
            "name": clean(z2.cell(r, 1).value),
            "definition": clean(z2.cell(r, 2).value),
            "levels": [clean(z2.cell(r, c).value) for c in range(3, 7)],
        })
    conditions = {wb["Z3 CONDITION VALUE"].cell(r, 1).value: wb["Z3 CONDITION VALUE"].cell(r, 2).value for r in range(3, 6)}
    return {
        "habitats": habitats,
        "enhance": enhance,
        # Upper-cased habitat names that appear in the Z8 time-to-target table at all
        "enhanceCovered": covered,
        "distinctivenessValues": values,
        "distinctivenessCategories": categories,
        "distinctivenessCriteria": criteria,
        "tradingRules": trading,
        "conditionValues": conditions,
        "intro": clean(z2.cell(3, 1).value),
    }


def criteria_sheets(path, eco):
    wb = openpyxl.load_workbook(path)
    out = []
    for ws in wb:
        cells = {(c.row, c.column): c.value for row in ws.iter_rows() for c in row if c.value is not None}
        hdr = next(r for (r, c), v in sorted(cells.items())
                   if isinstance(v, str) and v.strip().upper() in ("CRITERIA", "CRTIERIA"))
        points, source = {}, None
        for (r, c), v in cells.items():
            if r != hdr or not isinstance(v, str):
                continue
            m = re.match(r"(\d)\s*Points?", v.strip(), re.I)
            if m:
                points[c] = int(m.group(1))
            if "source" in v.lower():
                source = c
        crits, r = [], hdr + 1
        while not (isinstance(cells.get((r, 1)), str) and cells[(r, 1)].strip().upper().startswith("TOTAL")):
            b = cells.get((r, 2))
            if b is not None:
                head, _, desc = str(b).partition("\n")
                crits.append({
                    "name": clean(head),
                    "description": clean(desc),
                    "options": [{"points": p, "text": clean(cells[(r, c)])}
                                for c, p in sorted(points.items(), key=lambda x: -x[1]) if (r, c) in cells],
                    "source": clean(cells.get((r, source))) if source else "",
                })
            r += 1
        good = poor = None
        for rr in range(r + 1, r + 12):
            rule = cells.get((rr, 1))
            result = next((v.strip().capitalize() for cc in range(2, 15)
                           if isinstance(v := cells.get((rr, cc)), str) and v.strip().upper() in ("GOOD", "MODERATE", "POOR")), None)
            m = re.search(r"(>=|>|<=|<)\s*(\d+)", str(rule or ""))
            if result == "Good" and m:
                good = int(m.group(2)) + (1 if m.group(1) == ">" else 0)
            if result == "Poor" and m:
                poor = int(m.group(2)) - (1 if m.group(1) == "<" else 0)
        assert good and poor, ws.title
        out.append({
            "sheet": ws.title,
            "eco": eco,
            "habitat": CRITERIA_TO_HABITAT[ws.title],
            "title": clean(cells.get((1, 1))).title(),
            "includes": clean(re.sub(r"^Includes:\s*", "", str(cells.get((2, 1), "")))),
            "criteria": crits,
            "goodMin": good,
            "poorMax": poor,
        })
    return out


def main():
    metric, terr, fresh = sys.argv[1:4]
    data = metric_tables(metric)
    data["conditionSheets"] = criteria_sheets(terr, "terrestrial") + criteria_sheets(fresh, "freshwater")
    data["source"] = {
        "metric": "SG Biodiversity Accounting Metric 1.1",
        "citation": "AECOM & Camphora (2024). Singapore Biodiversity Accounting Metric: Version 1.1. "
                    "Available at: http://anz.planengage.com/singapore-bio-metric",
    }
    OUT.write_text("/* Generated by scripts/build_data.py from the SG BA Metric 1.1 workbooks. Do not edit by hand. */\n"
                   "(function (root) {\n  var DATA = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n"
                   "  if (typeof module !== 'undefined' && module.exports) module.exports = DATA;\n"
                   "  else root.SGBA_DATA = DATA;\n})(this);\n")
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes): {len(data['habitats'])} habitats, "
          f"{len(data['enhance'])} enhancement rows, {len(data['conditionSheets'])} condition sheets")


if __name__ == "__main__":
    main()
