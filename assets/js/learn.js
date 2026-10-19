/* "How it works": handbook content (Introduction, How it Works, User Guide, case studies). */
(function (root) {
  'use strict';
  var UI = root.UI, esc = UI.esc;
  var HANDBOOK = 'https://anz.planengage.com/singapore-bio-metric/page/';

  function render(el) {
    var cases = root.SGBA_PRESETS.map(function (p) {
      return '<div class="case"><div class="src">' + esc(p.source) + '</div><h3 style="margin:0">' + esc(p.title) + '</h3><p style="font-size:.88rem;color:var(--ink-2);margin:0">' + esc(p.summary) + '</p>' +
        '<div style="margin-top:auto"><button class="btn small primary" type="button" data-preset="' + p.key + '">Open in calculator</button></div></div>';
    }).join('');

    el.innerHTML =
      '<div class="grid-2">' +
      '<div class="card prose"><h2>What the metric does</h2>' +
      '<p>The Singapore Biodiversity Accounting (BA) Metric is a free tool that gives each habitat parcel in Singapore a numerical value: its <strong>biodiversity units</strong>. Comparing the units on a site before and after a project shows whether the project causes a <em>net loss</em>, <em>no net loss</em> or a <em>net gain</em> in biodiversity. That makes ecological advice easier to understand for non-specialists.</p>' +
      '<p>It can be used to:</p><ul>' +
      '<li>assess the biodiversity value of a site or area of land;</li>' +
      '<li>calculate losses or gains from development, land management or other interventions;</li>' +
      '<li>predict how habitat creation, enhancement, restoration or nature-based solutions support biodiversity;</li>' +
      '<li>compare design options (optioneering) and steer designs towards no net loss or net gain;</li>' +
      '<li>support biodiversity impact assessments, masterplanning, climate resilience work and nature-related disclosures (e.g. TNFD).</li></ul>' +
      '<p>It covers Singapore\'s terrestrial, freshwater and intertidal habitats, including urban green infrastructure such as living roofs and walls. Subtidal habitats are only assessed for reclamation projects.</p>' +
      '<div class="note">The metric is a <strong>proxy</strong> for biodiversity value. It covers only direct impacts within the project footprint, says nothing about individual species, and does not replace expert ecological advice, regulation or the mitigation hierarchy.</div>' +
      '</div>' +

      '<div class="card prose"><h2>How units are calculated</h2>' +
      '<p><strong>Baseline</strong>: every parcel before the project.</p>' +
      '<div class="formula">units = area (ha) × distinctiveness × condition</div>' +
      '<p><strong>Habitat creation</strong>: new parcels, discounted by how risky they are to create.</p>' +
      '<div class="formula">units = area × distinctiveness × target condition × difficulty multiplier</div>' +
      '<p><strong>Habitat enhancement</strong>: improving an existing parcel to a better condition or a more distinctive habitat. In the Metric 1.1 Excel tool:</p>' +
      '<div class="formula">units = A·D<sub>new</sub>·C<sub>new</sub> − A·D<sub>old</sub>·C<sub>old</sub>·m + A·D<sub>old</sub>·C<sub>old</sub></div>' +
      '<p><strong>Results</strong>, kept separate for each ecosystem:</p>' +
      '<div class="formula">post-development = retained units + created units + enhanced units<br>net change = post-development − baseline</div>' +
      '<p><strong>Distinctiveness</strong> values: Very high ×8 · High ×6 · Moderate ×4 · Low ×2 · Very low ×1 · Extremely low ×0.5 · No value ×0.<br>' +
      '<strong>Condition</strong>: Good ×3 · Moderate ×2 · Poor ×1.<br>' +
      '<strong>Difficulty</strong>: Low ×1 · Medium ×0.75 · High ×0.67 · Very high ×0.6.</p>' +
      '<p class="muted" style="font-size:.85rem">Example: 2 ha of native-dominated secondary forest (High, ×6) in moderate condition (×2) = 2 × 6 × 2 = <b>24 units</b>.</p>' +
      '</div></div>' +

      '<div class="card prose" style="max-width:none"><h2>Key concepts</h2><div class="grid-2">' +
      '<div>' +
      '<h3>Ecosystem types</h3><p>Habitats are terrestrial, freshwater or intertidal/marine, and all are measured by area. Units are <strong>never summed, traded or converted</strong> between ecosystem types. A no net loss or 10% net gain target applies to each ecosystem the project affects. Mangrove forest appears under both freshwater and marine so it can be classified to suit its setting.</p>' +
      '<h3>Habitat classification</h3><p>The metric extends the NParks Biodiversity Impact Assessment (2021) habitat list into 42 Singapore habitat types. Map every parcel to one of them (see the Habitat guide).</p>' +
      '<h3>Distinctiveness</h3><p>The typical biodiversity value of a habitat type, scored on species richness, irreplaceability, local rarity and unique species. Every parcel of the same type has the same distinctiveness.</p>' +
      '<h3>Condition</h3><p>How good a parcel is compared with others of its type, following the TNFD / SEEA EA definition of ecosystem condition: composition, structure and function. It comes from survey data scored against each habitat\'s condition criteria sheet. At early design stages, use conservative estimates.</p>' +
      '</div><div>' +
      '<h3>Time to target condition</h3><p>How many years a created or enhanced habitat takes to reach its target condition. It is for information only and does not change the units, but it should shape the habitat management plan.</p>' +
      '<h3>Difficulty (risk) multiplier</h3><p>Habitats that are hard to create or enhance, such as coral reefs and mangroves, get a smaller multiplier. This reflects the real risk of failure without discouraging the creation of valuable habitats.</p>' +
      '<h3>Habitat trading</h3><p>Lost habitats must be replaced according to their distinctiveness. Very high: irreplaceable, avoid at all costs. High: like-for-like. Moderate: same broad habitat or higher. Low: low distinctiveness or above. Very low: compensate the unit deficit. <em>Trading down</em> means replacing lost units with a less distinctive habitat.</p>' +
      '<h3>Error check</h3><p>The baseline area lost should equal the area created. A mismatch usually means a data-entry error, mixed decimal places or different site boundaries. It is expected for <strong>living walls and rooftop greenery</strong>, which are entered as flat areas on top of other habitats, and for <strong>reclamation</strong>, where marine habitat is unavoidably traded for land. Justify any mismatch in the report.</p>' +
      '</div></div></div>' +

      '<div class="grid-2">' +
      '<div class="card prose"><h2>How to run an assessment</h2><ol class="steps-list">' +
      '<li><strong>Collect data.</strong> Classify every habitat on site and survey the data the condition criteria need. Desk-based estimates are fine for early optioneering but should be checked with surveys later.</li>' +
      '<li><strong>Do the geospatial work.</strong> Map baseline parcels (area in ha to 4 decimal places, plus condition) and overlay the post-development footprint and landscape plans in GIS.</li>' +
      '<li><strong>Assess the baseline.</strong> Enter each parcel and split its area into retained, enhanced and lost.</li>' +
      '<li><strong>Assess post-development.</strong> Enter created habitats (including buildings) and choose enhancements. Be realistic about target conditions and timescales.</li>' +
      '<li><strong>Run the calculation.</strong> Check the results for each ecosystem, justify any deviation from the guidance, and use the metric to improve the design.</li>' +
      '<li><strong>Validate and report.</strong> An experienced ecologist should review the assessment. Record the assessor and reviewer, and report data, assumptions and limitations transparently.</li>' +
      '</ol></div>' +
      '<div class="card prose"><h2>Good practice</h2><ul>' +
      '<li>Follow the <strong>mitigation hierarchy</strong>: avoid, then minimise, then restore, and offset only as a last resort. Use the metric at every design stage.</li>' +
      '<li>Keep terrestrial, freshwater and marine units <strong>separate</strong>. Do not trade between them, except for unavoidable reclamation, which must be justified.</li>' +
      '<li>Do not <strong>trade down</strong> to less distinctive habitats. Treat very high distinctiveness habitats as irreplaceable.</li>' +
      '<li>Assess the <strong>same area</strong> before and after development. Include off-site enhancement or creation land in the baseline.</li>' +
      '<li>Prepare a <strong>habitat management and monitoring plan</strong> covering at least 30 years, with target conditions, indicators and the parties responsible.</li>' +
      '<li>Be transparent so the assessment cannot be used for <strong>greenwashing</strong>.</li>' +
      '</ul><p class="muted" style="font-size:.85rem">The full list of good practice principles is on the official <a href="' + HANDBOOK + 'Good-Practice-Principles" target="_blank" rel="noopener">Good Practice Principles</a> page.</p></div>' +
      '</div>' +

      '<div class="card"><h2>Case studies &amp; examples</h2><p class="muted">Each one loads into the calculator for you to explore. The case studies were written for an earlier metric version, so v1.1 values give slightly different totals, and transitions v1.1 no longer allows are entered as loss plus creation.</p><div class="case-grid">' + cases + '</div></div>' +

      '<div class="card prose" style="max-width:none"><h2>About this interactive edition</h2>' +
      '<p>This edition reproduces the calculations in the <em>SG BA Metric 1.1</em> Excel tool and the Terrestrial and Freshwater Condition Criteria 1.1 workbooks. It was checked against the Excel tool by recalculating randomly generated assessments in the original workbook. It differs from the workbook only where the workbook has lookup errors:</p><ul>' +
      '<li>In the terrestrial enhancement sheet, most rows read the difficulty multiplier from the proposed habitat in <code>row 8</code> (<code>VLOOKUP($H$8,…)</code>) instead of their own row. Here each row uses its own habitat.</li>' +
      '<li>In the marine enhancement sheet, the multiplier lookup stops at mudflats, so Excel returns <em>Error</em> (0 units) for rocky shore, artificial marine structures, sandy beach, lower reef and soft-sediment seabed. Here the published multipliers are used.</li>' +
      '<li>Excel takes the first match for mangrove forest, which gives marine mangroves the freshwater enhancement multiplier (×0.75). Here each ecosystem uses its own (marine ×0.67).</li>' +
      '<li><em>Forest or rural river</em> and <em>Naturalised river</em> are missing from the v1.1 enhancement time-to-target table. Excel returns #N/A, which breaks the freshwater total. Here these enhancements are flagged and score 0. Enter them as loss plus creation instead.</li>' +
      '<li>You can switch the enhancement formula (Results › Calculation settings) to apply the difficulty multiplier to the uplift only, as the handbook describes. By default the Excel formula is used.</li>' +
      '</ul>' +
      '<p><strong>Privacy:</strong> nothing you enter is saved or sent to a server. Closing or reloading the tab clears it. Share links carry your inputs only if you tick the option, and then only inside the link.</p>' +
      '<p>Source handbook: <a href="' + HANDBOOK + 'Introduction" target="_blank" rel="noopener">Introduction</a> · <a href="' + HANDBOOK + 'How-it-Works" target="_blank" rel="noopener">How it Works</a> · <a href="' + HANDBOOK + 'User-Guide" target="_blank" rel="noopener">User Guide</a> · <a href="' + HANDBOOK + 'SG-Bio-Accounting-Metric-10" target="_blank" rel="noopener">Official Excel tool &amp; criteria</a>. ' +
      'Cite as: AECOM &amp; Camphora (2024). <em>Singapore Biodiversity Accounting Metric: Version 1.1.</em></p>' +
      '</div>';

    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-preset]');
      if (b) root.Calculator.loadPreset(b.getAttribute('data-preset'));
    });
  }

  root.Learn = { render: render };
})(this);
