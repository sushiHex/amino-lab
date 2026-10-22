/* Local-only supporting evidence: active response time is never a mastery gate or penalty. */
(function (root) {
  'use strict';

  const VERSION = 1;
  const MAX_ACTIVE_MS = 30 * 60 * 1000;
  const MAX_SAMPLES = 15;
  const MIN_SAMPLES = 5;
  const MAX_COUNT = 1000000000;
  const CODES = new Set('ARNDCEQGHILKMFPSTWYV'.split(''));
  const SKILLS = new Set(['structure', 'name', 'three', 'one', 'contrast', 'draw', 'forge']);
  const SKILL_ALIASES = Object.freeze({ fromcode: 'name', choiceStructure: 'structure', choiceName: 'name', choiceThree: 'three', choiceOne: 'one' });
  const FORMATS = new Set(['typed', 'choice', 'draw', 'forge-guided', 'forge-challenge']);
  const REASONS = new Set(['invalid-snapshot', 'invalid-clock', 'clock-reversed', 'clock-gap', 'time-limit', 'no-active-time']);
  const object = value => !!value && typeof value === 'object' && !Array.isArray(value);
  const integer = (value, max = MAX_COUNT) => Number.isSafeInteger(value) && value >= 0 && value <= max;
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const validMs = value => Number.isFinite(value) && value > 0 && value <= MAX_ACTIVE_MS;
  const defaultNow = () => typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();

  // Contains no wall-clock origin or focus/interaction history. A snapshot never
  // counts time spent away from this document or waiting for a browser reload.
  function normalizeTimerSnapshot(raw) {
    if (!object(raw) || raw.version !== VERSION || !Number.isFinite(raw.activeMs) || raw.activeMs < 0 || raw.activeMs > MAX_ACTIVE_MS) return null;
    if (!['paused', 'completed', 'valid'].every(key => typeof raw[key] === 'boolean')) return null;
    if (raw.reason !== null && !REASONS.has(raw.reason)) return null;
    if ((raw.valid && raw.reason !== null) || (!raw.valid && raw.reason === null) || (raw.completed && raw.valid && raw.activeMs <= 0)) return null;
    return { version: VERSION, activeMs: raw.activeMs, paused: raw.paused, completed: raw.completed, valid: raw.valid, reason: raw.reason };
  }

  function createTimer(options = {}) {
    const now = typeof options.now === 'function' ? options.now : defaultNow;
    const maxActiveMs = validMs(options.maxActiveMs) ? options.maxActiveMs : MAX_ACTIVE_MS;
    const restored = own(options, 'snapshot');
    const saved = restored ? normalizeTimerSnapshot(options.snapshot) : null;
    let activeMs = saved ? Math.min(saved.activeMs, maxActiveMs) : 0;
    let paused = saved ? saved.paused : options.paused === true;
    let completed = saved ? saved.completed : false;
    let valid = restored ? !!saved && saved.valid : true;
    let reason = restored ? (saved ? saved.reason : 'invalid-snapshot') : null;
    // Both environment flags must be explicitly refreshed after restoration.
    // Explicit pause is independent, and must still be resumed by the host.
    let visible = restored ? false : options.visible !== false;
    let focused = restored ? false : options.focused !== false;
    let mark = null;
    if (saved && saved.activeMs > maxActiveMs) { valid = false; reason = 'time-limit'; }
    const active = () => !completed && !paused && visible && focused;
    function fail(cause) { valid = false; if (reason === null) reason = cause; }
    function readNow() {
      let value;
      try { value = now(); } catch (_) { value = NaN; }
      if (!Number.isFinite(value) || value < 0) { fail('invalid-clock'); return null; }
      return value;
    }
    function accrue() {
      if (!active()) return;
      const current = readNow();
      if (current === null) { mark = null; return; }
      if (mark !== null) {
        const delta = current - mark;
        if (delta < 0) fail('clock-reversed');
        else if (delta > maxActiveMs) fail('clock-gap');
        else if (activeMs + delta > maxActiveMs) { activeMs = maxActiveMs; fail('time-limit'); }
        else activeMs += delta;
      }
      mark = current;
    }
    function environment(changes) {
      accrue();
      if (typeof changes.visible === 'boolean') visible = changes.visible;
      if (typeof changes.focused === 'boolean') focused = changes.focused;
      if (typeof changes.paused === 'boolean') paused = changes.paused;
      mark = active() ? readNow() : null;
    }
    function snapshot() {
      accrue();
      return { version: VERSION, activeMs, paused, completed, valid, reason };
    }
    function complete() {
      if (completed) return null;
      accrue();
      completed = true;
      mark = null;
      if (activeMs <= 0) fail('no-active-time');
      return { activeMs, valid, complete: true, reason };
    }
    if (active()) mark = readNow();
    return Object.freeze({
      setEnvironment: changes => environment(object(changes) ? changes : {}),
      setVisible: value => environment({ visible: value }),
      setFocused: value => environment({ focused: value }),
      pause: () => environment({ paused: true }),
      resume: () => environment({ paused: false }),
      snapshot,
      complete
    });
  }

  function restoreTimer(snapshot, options = {}) { return createTimer({ ...options, snapshot }); }

  function emptyStats() { return { version: VERSION, records: {} }; }
  function emptyRecord() {
    return { attempts: 0, correct: 0, cleanCorrect: 0, hintedAttempts: 0, retryAttempts: 0, retryCount: 0, timedClean: 0, cleanTimes: [], cleanRun: 0, missRun: 0, supportEvents: 0, lastSupportAt: 0, lastAt: 0, lastOutcome: null, lastAssisted: false };
  }
  function recordKey(attempt) {
    if (!object(attempt)) return null;
    const skill = own(SKILL_ALIASES, attempt.skill) ? SKILL_ALIASES[attempt.skill] : attempt.skill;
    if (!CODES.has(attempt.code) || !SKILLS.has(skill) || !FORMATS.has(attempt.format)) return null;
    return [attempt.code, skill, attempt.format].join(':');
  }
  function normalizeRecord(raw) {
    const counters = ['attempts', 'correct', 'cleanCorrect', 'hintedAttempts', 'retryAttempts', 'retryCount', 'timedClean', 'cleanRun', 'missRun', 'supportEvents'];
    if (!object(raw) || !counters.every(key => integer(raw[key])) || !integer(raw.lastAt, Number.MAX_SAFE_INTEGER)) return null;
    if (!integer(raw.lastSupportAt, Number.MAX_SAFE_INTEGER) || (!raw.supportEvents && raw.lastSupportAt)) return null;
    if (!Array.isArray(raw.cleanTimes) || raw.cleanTimes.length > MAX_SAMPLES || raw.cleanTimes.some(value => !validMs(value))) return null;
    if (typeof raw.lastAssisted !== 'boolean' || ![null, 'correct', 'incorrect'].includes(raw.lastOutcome)) return null;
    if (raw.correct > raw.attempts || raw.cleanCorrect > raw.correct || raw.hintedAttempts > raw.attempts || raw.retryAttempts > raw.attempts || raw.retryCount < raw.retryAttempts || raw.timedClean > raw.cleanCorrect || raw.cleanTimes.length > raw.timedClean || raw.cleanRun > raw.cleanCorrect) return null;
    if (raw.cleanCorrect + raw.hintedAttempts > raw.attempts || raw.cleanCorrect + raw.retryAttempts > raw.attempts) return null;
    if ((!raw.attempts && (raw.lastOutcome !== null || raw.lastAssisted || raw.lastAt)) || (raw.attempts && raw.lastOutcome === null)) return null;
    if ((raw.lastOutcome === 'correct' && !raw.correct) || (raw.lastOutcome === 'incorrect' && raw.correct === raw.attempts)) return null;
    if (raw.lastAssisted && !raw.hintedAttempts && !raw.retryAttempts) return null;
    if (raw.cleanRun && (raw.lastOutcome !== 'correct' || raw.lastAssisted)) return null;
    if (raw.missRun > raw.attempts - raw.correct || (raw.missRun && (raw.lastOutcome !== 'incorrect' || raw.lastAssisted))) return null;
    const result = emptyRecord();
    for (const key of counters) result[key] = raw[key];
    result.cleanTimes = raw.cleanTimes.slice();
    result.lastAt = raw.lastAt;
    result.lastSupportAt = raw.lastSupportAt;
    result.lastOutcome = raw.lastOutcome;
    result.lastAssisted = raw.lastAssisted;
    return result;
  }
  function normalizeStats(raw) {
    const result = emptyStats();
    if (!object(raw) || raw.version !== VERSION || !object(raw.records)) return result;
    // Only the finite catalog is read; arbitrary/prototype keys cannot enter it.
    for (const code of CODES) for (const skill of SKILLS) for (const format of FORMATS) {
      const key = code + ':' + skill + ':' + format;
      if (!own(raw.records, key)) continue;
      const record = normalizeRecord(raw.records[key]);
      if (record && (record.attempts || record.supportEvents)) result.records[key] = record;
    }
    return result;
  }
  function getRecord(stats, context) {
    const key = recordKey(context);
    if (!key || !object(stats) || stats.version !== VERSION || !object(stats.records) || !own(stats.records, key)) return emptyRecord();
    return normalizeRecord(stats.records[key]) || emptyRecord();
  }
  function validTiming(timing) {
    return object(timing) && timing.valid === true && timing.complete === true && timing.reason === null && validMs(timing.activeMs);
  }
  function validAttempt(attempt) {
    return recordKey(attempt) !== null && typeof attempt.correct === 'boolean' && (attempt.hinted === undefined || typeof attempt.hinted === 'boolean') && (attempt.retries === undefined || integer(attempt.retries));
  }
  function cleanAttempt(attempt) { return attempt.correct === true && attempt.hinted !== true && !(attempt.retries > 0); }
  function increment(value, amount = 1) { return Math.min(MAX_COUNT, value + amount); }
  function resetPairedCleanRuns(stats, key, format) {
    if (!['typed', 'choice'].includes(format)) return;
    const [code, skill] = key.split(':');
    for (const pairedFormat of ['typed', 'choice']) {
      const paired = stats.records[code + ':' + skill + ':' + pairedFormat];
      if (paired) paired.cleanRun = 0;
    }
  }
  // The host calls this once on the first support request for a question, even
  // if it is abandoned. It is not an answer, wrong attempt, or double-counted
  // completed hint. Consumers compare both formats' lastSupportAt values.
  function noteSupport(stats, context) {
    const result = normalizeStats(stats), key = recordKey(context);
    if (!key) return result;
    resetPairedCleanRuns(result, key, context.format);
    const record = result.records[key] || emptyRecord();
    record.cleanRun = 0;
    record.supportEvents = increment(record.supportEvents);
    record.lastSupportAt = Math.max(record.lastSupportAt, integer(context.now, Number.MAX_SAFE_INTEGER) ? context.now : 0);
    result.records[key] = record;
    return result;
  }
  function recordAttempt(stats, attempt) {
    const result = normalizeStats(stats);
    if (!validAttempt(attempt)) return result;
    const key = recordKey(attempt), record = result.records[key] || emptyRecord();
    const retries = attempt.retries || 0, clean = cleanAttempt(attempt);
    // A fresh miss/help request supersedes old readiness in the paired answer
    // format, but never erases lifetime correct answers, time samples or rewards.
    if (!clean) resetPairedCleanRuns(result, key, attempt.format);
    if (record.attempts === MAX_COUNT) return result;
    record.attempts = increment(record.attempts);
    if (attempt.correct) record.correct = increment(record.correct);
    if (clean) record.cleanCorrect = increment(record.cleanCorrect);
    if (attempt.hinted) record.hintedAttempts = increment(record.hintedAttempts);
    if (retries) { record.retryAttempts = increment(record.retryAttempts); record.retryCount = increment(record.retryCount, retries); }
    record.cleanRun = clean ? increment(record.cleanRun) : 0;
    record.missRun = !attempt.correct && !attempt.hinted && !retries ? increment(record.missRun) : 0;
    record.lastAt = integer(attempt.now, Number.MAX_SAFE_INTEGER) ? attempt.now : 0;
    record.lastOutcome = attempt.correct ? 'correct' : 'incorrect';
    record.lastAssisted = attempt.hinted === true || retries > 0;
    if (clean && validTiming(attempt.timing)) {
      record.timedClean = increment(record.timedClean);
      record.cleanTimes.push(attempt.timing.activeMs);
      record.cleanTimes = record.cleanTimes.slice(-MAX_SAMPLES);
    }
    result.records[key] = record;
    return result;
  }
  function median(values) {
    const sorted = values.slice().sort((a, b) => a - b), middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  }
  // Call before recordAttempt to compare only with prior independent answers.
  // Five samples reduce the influence of a one-off easy/slow answer; the median
  // is local to this amino acid, objective skill, and exact response format.
  // Slower answers still receive ALL ordinary correct-answer evidence. There
  // is deliberately no negative score, countdown, target, or promotion here.
  function getFluencySignal(stats, attempt) {
    const record = getRecord(stats, attempt), samples = record.cleanTimes;
    const result = { positiveEvidence: false, status: 'no-valid-time', sampleCount: samples.length, typicalMs: samples.length >= MIN_SAMPLES ? median(samples) : null, activeMs: validTiming(attempt?.timing) ? attempt.timing.activeMs : null };
    if (!validAttempt(attempt) || !cleanAttempt(attempt)) { result.status = 'not-clean'; return result; }
    if (!validTiming(attempt.timing)) return result;
    if (samples.length < MIN_SAMPLES) { result.status = 'building-baseline'; return result; }
    result.positiveEvidence = attempt.timing.activeMs <= result.typicalMs;
    result.status = result.positiveEvidence ? 'positive' : 'neutral';
    return result;
  }

  const api = Object.freeze({ VERSION, MAX_ACTIVE_MS, MAX_SAMPLES, MIN_SAMPLES, createTimer, restoreTimer, normalizeTimerSnapshot, emptyStats, normalizeStats, getRecord, noteSupport, recordAttempt, getFluencySignal });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.AminoFluency = api;
})(typeof window !== 'undefined' ? window : globalThis);
