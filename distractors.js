/* Pure four-choice recognition practice. No DOM, storage, or recall-scoring effects. */
(function (root) {
  'use strict';

  const KINDS = Object.freeze({
    structure: 'structure', fromcode: 'fromcode', fullname: 'fromcode',
    three: 'three', threeletter: 'three', one: 'one', oneletter: 'one'
  });

  // Each list keeps three close confusions, without arbitrary filler in the
  // all20 catalog. Chemistry peers and misleading-code peers are intentional.
  // All IDs refer to real amino acids; names and codes come only from the catalog.
  const STRUCTURE_PEERS = Object.freeze({
    A: 'GVS', R: 'KHQ', N: 'DQE', D: 'NEQ', C: 'STM',
    E: 'QDN', Q: 'END', G: 'ASC', H: 'RKW', I: 'LVT',
    L: 'IVM', K: 'RHQ', M: 'CLK', F: 'YWH', P: 'HWL',
    S: 'TCA', T: 'SVC', W: 'FYH', Y: 'FWH', V: 'ILT'
  });
  const NAME_PEERS = Object.freeze({
    ...STRUCTURE_PEERS, A: 'RNG', R: 'AKH', G: 'EQA', P: 'FWH'
  });
  // Non-initial codes get deliberate initial-letter traps as well as close peers.
  // F/P, K/L, R/A, N/A, D/A, E/G, Q/G, W/T, and Y/T are not random filler.
  const ONE_PEERS = Object.freeze({
    ...STRUCTURE_PEERS,
    A: 'RGV', R: 'AKH', N: 'DQA', D: 'NEA',
    E: 'QDG', Q: 'ENG', G: 'EQA', L: 'IKV', K: 'LRH',
    F: 'PYW', P: 'FRW', T: 'WYS', W: 'TYF', Y: 'TWF'
  });

  // Neutral drawing features checked against structures/manifest.json and
  // structures/source-data.json (PubChem connectivity), not inferred from class.
  const FEATURES = Object.freeze({
    A: 'a single methyl (CH₃) group',
    R: 'three CH₂ groups, then a three-nitrogen guanidine group',
    N: 'one CH₂, then an amide, C(=O)NH₂',
    D: 'one CH₂, then a carboxyl group, COOH',
    C: 'CH₂–SH, with terminal sulfur',
    E: 'two CH₂ groups, then a carboxyl group, COOH',
    Q: 'two CH₂ groups, then an amide, C(=O)NH₂',
    G: 'just H as its side chain',
    H: 'one five-membered aromatic ring with two nitrogens',
    I: 'a branch on the first side-chain carbon: CH(CH₃)–CH₂–CH₃',
    L: 'a CH₂ spacer before the branch: CH₂–CH(CH₃)₂',
    K: 'four CH₂ groups, then a terminal amino group',
    M: 'CH₂–CH₂–S–CH₃, with sulfur inside the chain',
    F: 'a CH₂-linked benzene ring without OH',
    P: 'three CH₂ groups closing a ring back to the backbone nitrogen',
    S: 'CH₂–OH, without a methyl branch',
    T: 'CH(OH)–CH₃, with OH and a methyl branch',
    W: 'two fused aromatic rings, including one NH',
    Y: 'a CH₂-linked benzene ring with OH opposite the attachment',
    V: 'CH(CH₃)₂: two methyl branches on the first side-chain carbon'
  });

  function shuffled(values, random) {
    const result = values.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const value = random();
      if (!Number.isFinite(value) || value < 0 || value >= 1) {
        throw new RangeError('random must return a number from 0 (inclusive) to 1 (exclusive)');
      }
      const j = Math.floor(value * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function optionLabel(aminoAcid, kind) {
    return kind === 'one' ? aminoAcid.one : kind === 'three' ? aminoAcid.three : aminoAcid.name;
  }

  function feedbackFor(target, choice, kind) {
    const same = target.one === choice.one;
    if (kind === 'structure') {
      const answer = `${target.name} has ${FEATURES[target.one]}.`;
      return same ? answer : `${answer} ${choice.name} instead has ${FEATURES[choice.one]}.`;
    }
    if (kind === 'one') {
      const answer = `${target.name} is ${target.one}.`;
      return same ? answer : `${answer} ${choice.one} is ${choice.name}.`;
    }
    if (kind === 'three') {
      const answer = `${target.name} is ${target.three}.`;
      return same ? answer : `${answer} ${choice.three} is ${choice.name}.`;
    }
    const answer = `${target.three} (${target.one}) means ${target.name}.`;
    return same ? answer : `${answer} ${choice.name} is ${choice.three} (${choice.one}).`;
  }

  /**
   * Return four shuffled { id, label, correct, feedback } options.
   * id is the amino acid's one-letter code. Feedback is post-answer content.
   * This is recognition practice: callers must not award free-recall evidence.
   * Pass a seeded random function to reproduce an option order. Inputs are never
   * mutated. A reduced catalog is supported if it contains four valid entries.
   */
  function createAnswerOptions({ aminoAcid, kind, aminoAcids, random = Math.random } = {}) {
    if (!Object.prototype.hasOwnProperty.call(KINDS, kind)) throw new Error('Unsupported answer kind');
    kind = KINDS[kind];
    if (!Array.isArray(aminoAcids) || aminoAcids.length < 4) {
      throw new Error('At least four amino acids are required');
    }
    if (typeof random !== 'function') throw new TypeError('random must be a function');
    const byId = new Map();
    const names = new Set();
    const threeCodes = new Set();
    for (const entry of aminoAcids) {
      if (!entry || !Object.prototype.hasOwnProperty.call(FEATURES, entry.one) ||
          typeof entry.name !== 'string' || !entry.name.trim() ||
          typeof entry.three !== 'string' || !/^[A-Z][a-z]{2}$/.test(entry.three) ||
          byId.has(entry.one) || names.has(entry.name) || threeCodes.has(entry.three)) {
        throw new Error('Amino-acid catalog must have unique valid IDs, names, and codes');
      }
      byId.set(entry.one, entry);
      names.add(entry.name);
      threeCodes.add(entry.three);
    }
    const target = aminoAcid && byId.get(aminoAcid.one);
    if (!target) throw new Error('Target amino acid is not in the catalog');
    const peers = kind === 'one' ? ONE_PEERS : kind === 'structure' ? STRUCTURE_PEERS : NAME_PEERS;
    const chosen = [target];
    const used = new Set([target.one]);
    const add = entry => {
      if (entry && !used.has(entry.one) && chosen.length < 4) {
        chosen.push(entry);
        used.add(entry.one);
      }
    };
    for (const id of peers[target.one]) add(byId.get(id));
    // Full all20 catalogs use curated peers only. For a subset, prefer remaining
    // same-class entries before a randomized fill; never invent a fourth answer.
    if (chosen.length < 4) {
      shuffled(aminoAcids.filter(entry => entry.group === target.group), random).forEach(add);
      if (chosen.length < 4) shuffled(aminoAcids, random).forEach(add);
    }
    return shuffled(chosen, random).map(choice => ({
      id: choice.one,
      label: optionLabel(choice, kind),
      correct: choice.one === target.one,
      feedback: feedbackFor(target, choice, kind)
    }));
  }

  const api = Object.freeze({ createAnswerOptions });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.AminoDistractors = api;
})(typeof window !== 'undefined' ? window : globalThis);
