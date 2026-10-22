/* Pure local Focus 3 checklist. These are practice checks, never a mastery score.
 * No storage, scoring, network, or raw-answer/behavior-history side effects.
 */
(function (root) {
  'use strict';
  const VERSION = 1;
  const CODES = new Set('ARNDCEQGHILKMFPSTWYV'.split(''));
  const KINDS = Object.freeze(['structure', 'fromcode', 'three', 'one', 'classify', 'draw']);
  const RECALL = KINDS.slice(0, 4);
  const FRESH_MS = 7 * 86400000;
  const MAX_IDS = 96;
  const object = value => !!value && typeof value === 'object' && !Array.isArray(value);
  const time = value => Number.isSafeInteger(value) && value >= 0;
  const number = value => Number.isFinite(value) && value >= 0 ? value : 0;
  const skillKey = kind => kind === 'fromcode' ? 'name' : kind;
  const choiceKey = kind => ({ structure: 'choiceStructure', fromcode: 'choiceName', three: 'choiceThree', one: 'choiceOne' })[kind];
  const stat = (item, kind) => object(item?.skills?.[skillKey(kind)]) ? item.skills[skillKey(kind)] : {};
  const validId = value => typeof value === 'string' && /^[A-Za-z0-9:._-]{1,120}$/.test(value);
  const fresh = (at, now) => time(at) && at > 0 && at <= now && now - at <= FRESH_MS;
  function pool(items) {
    if (!Array.isArray(items)) return [];
    const seen = new Set();
    return items.filter(item => object(item) && CODES.has(item.code) && !seen.has(item.code) && seen.add(item.code));
  }
  function isDue(item, kind, now) {
    const t = stat(item, kind), last = Math.max(number(t.lastAttempt), number(t.lastExposure));
    if (!(number(t.nextDue) > 0 && now >= t.nextDue && number(t.lastAttempt) > 0 && now - last >= 120000)) return false;
    return !Array.isArray(item?.dueKinds) || item.dueKinds.includes(kind) || item.dueKinds.includes(skillKey(kind));
  }
  // Fresh, matching typed evidence only. A newer miss/help in EITHER response
  // format supersedes a lifetime success; recognition cannot pass a recall goal.
  function evidence(item, kind, fluency, now) {
    const t = stat(item, kind), choice = item?.skills?.[choiceKey(kind)] || {};
    const records = object(fluency?.records) ? fluency.records : {};
    const tr = records[`${item.code}:${skillKey(kind)}:typed`];
    const cr = records[`${item.code}:${skillKey(kind)}:choice`];
    const known = record => object(record) && (number(record.attempts) > 0 || number(record.supportEvents) > 0 || number(record.lastSupportAt) > 0);
    const hintAt = record => number(record.hinted) > 0 && number(record.lastExposure) >= number(record.lastAttempt) ? number(record.lastExposure) : 0;
    const legacySupportAt = Math.max(hintAt(t), hintAt(choice));
    const legacyBadAt = Math.max(...[t, choice].map(record => number(record.wrong) > 0 && number(record.streak) === 0 ? number(record.lastAttempt) : 0));
    const unknownLegacyMiss = [t, choice].some(record => number(record.wrong) > 0 && number(record.streak) === 0 && !number(record.lastAttempt));
    let ready = false, at = 0, weak = false;
    if (known(tr) || known(cr)) {
      // Ordinary hint totals have no timestamp of their own: lastExposure
      // also advances on clean-answer feedback. Prefer each format's support
      // telemetry where present, but retain uninstrumented paired-format help.
      const supportAt = Math.max(number(tr?.lastSupportAt), number(cr?.lastSupportAt), known(tr) ? 0 : hintAt(t), known(cr) ? 0 : hintAt(choice));
      const blockedAt = Math.max(legacyBadAt, ...[tr, cr].filter(record => known(record) && (record.lastOutcome === 'incorrect' || record.lastAssisted === true)).map(record => number(record.lastAt)));
      ready = !unknownLegacyMiss && known(tr) && tr.lastOutcome === 'correct' && tr.lastAssisted === false && number(tr.cleanRun) > 0 && fresh(tr.lastAt, now) && (!supportAt || tr.lastAt > supportAt) && (!blockedAt || tr.lastAt > blockedAt);
      at = ready ? tr.lastAt : 0;
      weak = !ready && (supportAt > 0 || blockedAt > 0 || unknownLegacyMiss);
    } else {
      const supportAt = legacySupportAt, badAt = legacyBadAt;
      // A zero-timestamp legacy miss is uncertain, not proof it preceded a win.
      const unknownMiss = unknownLegacyMiss;
      ready = number(t.right) > 0 && number(t.streak) > 0 && fresh(t.lastAttempt, now) && !unknownMiss && (!supportAt || t.lastAttempt > supportAt) && (!badAt || t.lastAttempt > badAt);
      at = ready ? t.lastAttempt : 0;
      weak = !ready && (supportAt > 0 || badAt > 0 || unknownMiss);
    }
    const due = isDue(item, kind, now);
    return { ready: !!ready && !due, at, weak, due };
  }
  function suggestTrio({ items, fluency, now = Date.now(), random = Math.random } = {}) {
    if (!time(now) || typeof random !== 'function') throw new TypeError('Invalid Focus planning input');
    const entries = pool(items);
    if (entries.length < 3) throw new TypeError('Focus needs at least three different amino acids');
    return entries.map((item, index) => {
      const checks = RECALL.map(kind => evidence(item, kind, fluency, now));
      const missing = checks.filter(check => !check.ready).length;
      const familiar = checks.filter(check => check.ready || check.at > 0).length;
      // A short-session heuristic: close near-ready gaps before committing the
      // whole session to the three hardest items. Due familiar skills remain
      // useful, while already-clear recall sets fall behind unfinished ones.
      const score = !missing ? 0 : (familiar ? 10 + familiar * 2 - missing : 3) + Math.min(3, checks.filter(check => check.weak).length) + Math.min(4, checks.filter(check => check.due).length * 2);
      const value = random();
      return { code: item.code, score, tie: Number.isFinite(value) ? value : index / entries.length };
    }).sort((a, b) => b.score - a.score || a.tie - b.tie).slice(0, 3).map(item => item.code);
  }
  function createState({ codes, items = [], fluency, now = Date.now() } = {}) {
    if (!Array.isArray(codes) || codes.length !== 3 || new Set(codes).size !== 3 || codes.some(code => !CODES.has(code)) || !time(now)) throw new TypeError('Focus needs exactly three valid, distinct amino acids');
    const entries = new Map(pool(items).map(item => [item.code, item]));
    const state = { version: VERSION, codes: [...codes], createdAt: now, updatedAt: now, cells: {}, recentIds: [] };
    for (const code of codes) {
      state.cells[code] = {};
      for (const kind of KINDS) {
        const check = RECALL.includes(kind) ? evidence(entries.get(code) || { code }, kind, fluency, now) : { ready: false, at: 0 };
        state.cells[code][kind] = { done: check.ready, lastAt: check.ready ? check.at : 0, source: check.ready ? 'prior' : null, needsRetry: false, otherSince: 0 };
      }
    }
    return state;
  }
  function validateState(raw) {
    try {
      if (!object(raw) || raw.version !== VERSION || !Array.isArray(raw.codes) || raw.codes.length !== 3 || new Set(raw.codes).size !== 3 || raw.codes.some(code => !CODES.has(code)) || !time(raw.createdAt) || !time(raw.updatedAt) || raw.updatedAt < raw.createdAt || !object(raw.cells) || !Array.isArray(raw.recentIds) || raw.recentIds.length > MAX_IDS || raw.recentIds.some(id => !validId(id)) || new Set(raw.recentIds).size !== raw.recentIds.length) return null;
      const cells = {};
      for (const code of raw.codes) {
        if (!object(raw.cells[code])) return null;
        cells[code] = {};
        for (const kind of KINDS) {
          const cell = raw.cells[code][kind];
          if (!object(cell) || typeof cell.done !== 'boolean' || !time(cell.lastAt) || cell.lastAt > raw.updatedAt || ![null, 'prior', 'practice'].includes(cell.source) || (cell.done ? !cell.lastAt || cell.source === null : cell.source !== null) || (cell.source === 'prior' && (!RECALL.includes(kind) || cell.lastAt > raw.createdAt)) || (cell.source === 'practice' && cell.lastAt < raw.createdAt)) return null;
          const needsRetry = cell.needsRetry === undefined ? !cell.done && cell.lastAt >= raw.createdAt && cell.lastAt > 0 : cell.needsRetry;
          const otherSince = cell.otherSince === undefined ? 0 : cell.otherSince;
          if (typeof needsRetry !== 'boolean' || !Number.isInteger(otherSince) || otherSince < 0 || otherSince > 3 || (cell.done && needsRetry) || (!needsRetry && otherSince !== 0)) return null;
          cells[code][kind] = { done: cell.done, lastAt: cell.lastAt, source: cell.source, needsRetry, otherSince };
        }
      }
      return { version: VERSION, codes: [...raw.codes], createdAt: raw.createdAt, updatedAt: raw.updatedAt, cells, recentIds: [...raw.recentIds] };
    } catch (_) { return null; }
  }
  function summarize(raw) {
    const state = validateState(raw);
    if (!state) return null;
    const perCode = {};
    let done = 0;
    for (const code of state.codes) {
      const count = KINDS.filter(kind => state.cells[code][kind].done).length;
      perCode[code] = { done: count, total: KINDS.length, complete: count === KINDS.length };
      done += count;
    }
    return { done, total: 18, complete: done === 18, perCode };
  }
  function chooseRound({ state: raw, items = [], fluency, now = Date.now(), random = Math.random, limit = 6 } = {}) {
    const state = validateState(raw);
    if (!state || !time(now) || typeof random !== 'function' || !Number.isInteger(limit) || limit < 1 || limit > 6) throw new TypeError('Invalid Focus round input');
    const entries = new Map(pool(items).map(item => [item.code, item]));
    const candidates = [];
    for (const code of state.codes) for (const kind of KINDS) {
      const cell = state.cells[code][kind];
      if (cell.done) continue;
      const item = entries.get(code) || { code };
      const check = RECALL.includes(kind) ? evidence(item, kind, fluency, now) : { weak: false, due: false };
      const value = random();
      candidates.push({ code, kind, item, lastAt: cell.lastAt, priority: check.weak ? 0 : check.due ? 1 : 2, reasonKey: check.weak ? 'weak' : check.due ? 'due' : 'gap', tie: Number.isFinite(value) ? value : 0 });
    }
    const result = [], codeUse = {}, kindUse = {}, used = new Set();
    const simulated = Object.fromEntries(state.codes.flatMap(code => KINDS.map(kind => [`${code}:${kind}`, state.cells[code][kind].otherSince])));
    while (candidates.length && result.length < limit) {
      const previous = result.at(-1);
      let eligible = candidates.filter(task => !state.cells[task.code][task.kind].needsRetry || simulated[`${task.code}:${task.kind}`] >= 3);
      if (!eligible.length) {
        // When just a retry remains, short already-cleared retrieval checks on
        // the OTHER acids create separation. Never claim delayed-memory credit.
        eligible = state.codes.flatMap(code => RECALL.map(kind => ({code,kind})))
          .filter(task => !used.has(`${task.code}:${task.kind}`) && candidates.some(blocked => blocked.code !== task.code))
          .map(task => ({ ...task, item: entries.get(task.code) || {code:task.code}, lastAt: state.cells[task.code][task.kind].lastAt, priority: state.cells[task.code][task.kind].done ? 0 : 1, reasonKey: 'interleave', review: true, tie: 0 }));
        if (!eligible.length) break;
      }
      eligible.sort((a, b) => Number(a.code === previous?.code) - Number(b.code === previous?.code) || Number(a.lastAt > 0) - Number(b.lastAt > 0) || (codeUse[a.code] || 0) - (codeUse[b.code] || 0) || (kindUse[a.kind] || 0) - (kindUse[b.kind] || 0) || a.lastAt - b.lastAt || a.priority - b.priority || a.tie - b.tie || KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind));
      const next = eligible[0], task = { code: next.code, kind: next.kind, reasonKey: next.reasonKey };
      const index = candidates.findIndex(candidate => candidate.code === next.code && candidate.kind === next.kind);
      if (index >= 0) candidates.splice(index, 1);
      if (next.review) task.review = true;
      if (RECALL.includes(next.kind)) task.answerFormat = next.review ? 'typed' : next.item.formats?.[next.kind] === 'choice' ? 'choice' : 'typed';
      result.push(task);
      used.add(`${next.code}:${next.kind}`);
      codeUse[next.code] = (codeUse[next.code] || 0) + 1;
      kindUse[next.kind] = (kindUse[next.kind] || 0) + 1;
      for (const code of state.codes) if (code !== next.code) for (const kind of KINDS) {
        if (state.cells[code][kind].needsRetry) simulated[`${code}:${kind}`] = Math.min(3, simulated[`${code}:${kind}`] + 1);
      }
    }
    return result;
  }
  function applyOutcome(raw, outcome) {
    const state = validateState(raw);
    if (!state) return null;
    if (!object(outcome) || !state.codes.includes(outcome.code) || !KINDS.includes(outcome.kind) || !validId(outcome.eventId) || state.recentIds.includes(outcome.eventId) || typeof outcome.correct !== 'boolean' || typeof outcome.assisted !== 'boolean' || !time(outcome.now) || outcome.now === 0 || outcome.now < state.updatedAt) return state;
    if (['firstAttempt', 'selfRated', 'earlyReference', 'recognition'].some(key => outcome[key] !== undefined && typeof outcome[key] !== 'boolean') || (RECALL.includes(outcome.kind) && !['typed', 'choice'].includes(outcome.answerFormat))) return state;
    const cell = state.cells[outcome.code][outcome.kind];
    if (outcome.now < cell.lastAt) return state;
    const recall = RECALL.includes(outcome.kind);
    let passed = false;
    if (recall) passed = outcome.correct && !outcome.assisted && outcome.answerFormat === 'typed' && outcome.recognition !== true && outcome.firstAttempt !== false;
    else if (outcome.kind === 'classify') passed = outcome.correct && !outcome.assisted && outcome.firstAttempt === true;
    else passed = outcome.correct && outcome.selfRated === true && outcome.earlyReference === false;
    // A clean recognition answer is useful practice, but neither passes nor
    // erases an already completed typed check. Help/misses reopen that check.
    const recognitionOnly = recall && outcome.correct && !outcome.assisted && (outcome.answerFormat === 'choice' || outcome.recognition === true) && outcome.firstAttempt !== false;
    const separated = !cell.needsRetry || cell.otherSince >= 3;
    const failed = !outcome.correct || (recall || outcome.kind === 'classify' ? outcome.assisted || outcome.firstAttempt === false : outcome.earlyReference === true || outcome.selfRated !== true);
    if (!recognitionOnly) {
      cell.done = !!passed && separated;
      cell.source = cell.done ? 'practice' : null;
      if (cell.done) { cell.needsRetry = false; cell.otherSince = 0; }
      else if (failed) { cell.needsRetry = true; cell.otherSince = 0; }
    }
    for (const code of state.codes) if (code !== outcome.code) for (const kind of KINDS) {
      const other = state.cells[code][kind];
      if (other.needsRetry) other.otherSince = Math.min(3, other.otherSince + 1);
    }
    cell.lastAt = outcome.now;
    // Existing prior evidence retains its actual timestamp after recognition;
    // do not relabel a recognition timestamp as a prior typed recall result.
    if (recognitionOnly && cell.source === 'prior') cell.lastAt = raw.cells[outcome.code][outcome.kind].lastAt;
    state.updatedAt = Math.max(state.updatedAt, outcome.now);
    state.recentIds = [...state.recentIds, outcome.eventId].slice(-MAX_IDS);
    return state;
  }
  function invalidate(raw, { code, kind, now = Date.now() } = {}) {
    const state = validateState(raw);
    if (!state || !state.codes.includes(code) || !KINDS.includes(kind) || !time(now) || now < state.createdAt || now < state.cells[code][kind].lastAt) return state;
    state.cells[code][kind] = { done: false, lastAt: now, source: null, needsRetry: true, otherSince: 0 };
    state.updatedAt = Math.max(state.updatedAt, now);
    return state;
  }
  const api = Object.freeze({ VERSION, KINDS, FRESH_MS, suggestTrio, createState, validateState, chooseRound, applyOutcome, invalidate, summarize });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.AminoFocusEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
