/*
 * Example scenarios based on the handbook's example assessment and case studies.
 * Inputs follow the case-study narratives; the case studies were written for an earlier
 * metric version, so v1.1 distinctiveness values give slightly different totals, and
 * transitions the v1.1 tables no longer allow are modelled as loss + creation.
 */
(function (root) {
  'use strict';

  function rows(eco, list) {
    return list.map(function (r, i) {
      return {
        id: eco[0] + 'p' + i,
        ref: r[0],
        habitat: eco + ':' + r[1],
        area: r[2],
        condition: r[3] || '',
        retained: r[4] || 0,
        enhanced: r[5] || 0
      };
    });
  }

  var PRESETS = [
    {
      key: 'office',
      title: 'Hypothetical office complex',
      source: 'Handbook: Example Assessment',
      summary: 'An 8.75 ha office development clears native and exotic secondary forest; 1.93 ha of exotic forest is enhanced towards native-dominated forest over 30 years.',
      project: { name: 'Hypothetical office complex', stage: 'Concept design', assessor: '', reviewer: '' },
      ecosystems: {
        terrestrial: {
          baseline: rows('terrestrial', [
            ['B1', 'Native dominated secondary forest', 4.04, 'Poor'],
            ['B2', 'Exotic-dominated secondary forest', 3.83, 'Good', 0, 1.93],
            ['B3', 'Turf', 0.6, 'Poor']
          ]),
          creation: rows('terrestrial', [
            ['P1', 'Developed land', 4.18, ''],
            ['P2', 'Urban park/garden', 1.16, 'Moderate'],
            ['P3', 'Streetscape', 1.2, 'Moderate']
          ]),
          enhancement: { tp1: { target: 'terrestrial:Native dominated secondary forest', condition: 'Poor' } }
        },
        freshwater: {
          baseline: rows('freshwater', [['B4', 'Unmanaged soft bank pond', 0.18, 'Moderate', 0.18]]),
          creation: [],
          enhancement: {}
        },
        marine: { baseline: [], creation: [], enhancement: {} }
      }
    },
    {
      key: 'residential',
      title: 'Residential development on a golf course',
      source: 'Case Study 1, Site Option 2',
      summary: 'Housing replaces 17.67 ha of golf course, streetscape and buildings with developed land, rooftop greenery and new streetscape.',
      project: { name: 'Residential development (golf course site)', stage: 'Site optioneering', assessor: '', reviewer: '' },
      ecosystems: {
        terrestrial: {
          baseline: rows('terrestrial', [
            ['B2.1', 'Golf course', 12.44, 'Moderate'],
            ['B2.2', 'Streetscape', 4.77, 'Poor'],
            ['B2.3', 'Developed land', 0.46, '']
          ]),
          creation: rows('terrestrial', [
            ['P2.1', 'Developed land', 5.79, ''],
            ['P2.2', 'Outdoor rooftop greenery', 2.71, 'Moderate'],
            ['P2.3', 'Bare ground', 2.83, ''],
            ['P2.4', 'Streetscape', 6.34, 'Moderate']
          ]),
          enhancement: {}
        },
        freshwater: { baseline: [], creation: [], enhancement: {} },
        marine: { baseline: [], creation: [], enhancement: {} }
      }
    },
    {
      key: 'nbs',
      title: 'Nature-based coastal protection',
      source: 'Case Study 3, optimised solution',
      summary: 'Seawalls with coral recruitment structures plus a restored seagrass meadow, replacing part of a coral reef and a degraded sandy beach.',
      project: { name: 'Changi coastal erosion: optimised NBS', stage: 'Optioneering', assessor: '', reviewer: '' },
      ecosystems: {
        terrestrial: { baseline: [], creation: [], enhancement: {} },
        freshwater: { baseline: [], creation: [], enhancement: {} },
        marine: {
          baseline: rows('marine', [
            ['B3.1', 'Coral reef', 1.583, 'Moderate'],
            ['B3.2', 'Sandy beach', 3.81, 'Poor']
          ]),
          creation: rows('marine', [
            ['C1.1', 'Coral reef', 0.0325, 'Moderate'],
            ['C1.2', 'Seagrass meadow', 3.81, 'Moderate'],
            ['C1.3', 'Artificial marine structures', 0.288, 'Moderate']
          ]),
          enhancement: {}
        }
      }
    },
    {
      key: 'reclamation',
      title: 'Coastal reclamation for a hotel',
      source: 'Case Study 4, with seagrass restoration',
      summary: 'Reclaiming sandy beach and a patch reef for a hotel with rooftop and vertical greenery, plus 4.43 ha of seagrass meadow. Marine units are traded for terrestrial ones, so the area check reports N.',
      project: { name: 'Sembawang reclamation hotel', stage: 'Feasibility', assessor: '', reviewer: '' },
      ecosystems: {
        terrestrial: {
          baseline: [],
          creation: rows('terrestrial', [
            ['P1.1', 'Outdoor rooftop greenery', 2.66, 'Poor'],
            ['P1.2', 'Outdoor vertical greenery', 1.5, 'Poor'],
            ['P1.3', 'Developed land', 10.434, '']
          ]),
          enhancement: {}
        },
        freshwater: { baseline: [], creation: [], enhancement: {} },
        marine: {
          baseline: rows('marine', [
            ['B1.1', 'Coral reef', 0.296, 'Moderate'],
            ['B1.2', 'Sandy beach', 10.434, 'Moderate'],
            ['B2.1', 'Sandy beach', 4.434, 'Moderate']
          ]),
          creation: rows('marine', [['E1.1', 'Seagrass meadow', 4.434, 'Good']]),
          enhancement: {}
        }
      }
    }
  ];

  root.SGBA_PRESETS = PRESETS;
})(this);
