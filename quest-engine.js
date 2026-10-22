/* Pure, bounded planning and persistence for the six-step mixed study quest. */
(function (root) {
  'use strict';
  const CODES = new Set('ARNDCEQGHILKMFPSTWYV'.split(''));
  const KINDS = ['structure', 'fromcode', 'three', 'one', 'forge', 'draw'];
  const RECALL = KINDS.slice(0, 4);
  const REASONS = {
    dueRecall: 'This skill is due for a later recall check, after time away from its answer.',
    weakRecall: 'A recent miss or use of help suggests revisiting this skill.',
    newRecall: 'This skill has not had an unaided answer yet.',
    practiceRecall: 'This is one of your less-practiced recall skills. Try it on a fresh amino acid.',
    recognitionReady: 'Two recent clean recognition answers suggest trying this same skill without options.',
    recallReady: 'Recent clean typed answers support continuing without options for this skill.',
    supportRecall: 'Repeated misses on this skill suggest using choices and opening a hint if you need one.',
    staleRecall: 'There is not enough recent clean-answer evidence. Start with choices before stepping back up.',
    guidedNew: 'This structure is still unfamiliar. Build it with a supplied scaffold and ghost hints first.',
    guidedWeak: 'A recent structure or building attempt needs practice. Use a guided build to inspect the connections.',
    challengeBuild: 'Its identity is familiar. Try choosing the building pieces without ghost hints; the scaffold still helps.',
    familiarDraw: 'You have recalled its identity across the four skills. Now try a blank drawing and self-check it.',
    blankDraw: 'Try a blank drawing to find what needs practice. Hints are available, and the result is self-rated.'
  };
  const object = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const integer = (x, min, max) => Number.isSafeInteger(x) && x >= min && x <= max;
  const skillKey = kind => kind === 'fromcode' ? 'name' : kind;
  const choiceSkillKey = kind => ({ structure: 'choiceStructure', fromcode: 'choiceName', three: 'choiceThree', one: 'choiceOne' })[kind];
  const stat = (item, kind) => object(item.skills?.[skillKey(kind)]) ? item.skills[skillKey(kind)] : {};
  const number = x => Number.isFinite(x) && x >= 0 ? x : 0;
  const miss = t => number(t.wrong) > 0 && number(t.streak) === 0;
  function due(item, kind, now) {
    const t = stat(item, kind), last = Math.max(number(t.lastAttempt), number(t.lastExposure));
    if (!(number(t.lastAttempt) > 0 && number(t.nextDue) > 0 && now >= t.nextDue && now - last >= 120000)) return false;
    // The host's dueKinds includes its review-history check; never bypass exposure/time gates.
    if (Array.isArray(item.dueKinds)) return item.dueKinds.includes(kind) || item.dueKinds.includes(skillKey(kind));
    return now - last >= 21600000 || !number(t.missQuestion) || number(t.attemptOther ?? item.attemptOther) >= 3;
  }
  // A bounded study heuristic, not an ability score. Speed and global XP never promote a skill.
  // Scheduled retention checks are exempt from this freshness window: time away is their purpose.
  const READY_WINDOW = 7 * 86400000;
  function chooseDifficulty({ item, kind, now = Date.now(), fluency } = {}) {
    if (!object(item) || !CODES.has(item.code) || !RECALL.includes(kind) || !Number.isFinite(now)) throw new TypeError('Invalid difficulty input');
    const typed = stat(item, kind), choice = item.skills?.[choiceSkillKey(kind)] || {};
    const records = object(fluency?.records) ? fluency.records : {};
    const tr = records[`${item.code}:${skillKey(kind)}:typed`], cr = records[`${item.code}:${skillKey(kind)}:choice`];
    const known = r => object(r) && (number(r.attempts) > 0 || number(r.supportEvents) > 0 || number(r.lastSupportAt) > 0);
    const fresh = at => number(at) > 0 && at <= now && now - at <= READY_WINDOW;
    const outcomeClean = r => known(r) && r.lastOutcome === 'correct' && r.lastAssisted === false && number(r.cleanRun) > 0 && number(r.lastAt) > 0 && r.lastAt <= now;
    const supportAt = Math.max(number(tr?.lastSupportAt), number(cr?.lastSupportAt));
    const blockedAt = Math.max(...[tr, cr].filter(r => known(r) && (r.lastOutcome === 'incorrect' || r.lastAssisted === true)).map(r => number(r.lastAt)), supportAt);
    const recentClean = r => outcomeClean(r) && r.lastAt >= blockedAt && number(r.cleanRun) >= 2 && fresh(r.lastAt);
    let answerFormat = 'choice', reasonKey = 'practiceRecall', supportRecommended = false;
    if (known(tr) || known(cr)) {
      // Once new telemetry exists it is authoritative. Paired cleanRun counters are reset
      // by the fluency reducer on a miss/hint/retry, without deleting lifetime evidence.
      if (due(item, kind, now) && outcomeClean(tr) && tr.lastAt >= blockedAt && (!supportAt || number(tr.cleanRun) >= 2 || recentClean(cr))) {
        answerFormat = 'typed'; reasonKey = 'dueRecall';
      } else if (recentClean(cr)) {
        answerFormat = 'typed'; reasonKey = 'recognitionReady';
      } else if (recentClean(tr)) {
        answerFormat = 'typed'; reasonKey = 'recallReady';
      } else {
        const latest = [tr, cr].filter(known).sort((a, b) => Math.max(number(b.lastAt), number(b.lastSupportAt)) - Math.max(number(a.lastAt), number(a.lastSupportAt)))[0];
        supportRecommended = latest.lastOutcome === 'incorrect' && !latest.lastAssisted && number(latest.missRun) >= 2;
        reasonKey = supportRecommended ? 'supportRecall' : latest.lastOutcome === 'incorrect' || latest.lastAssisted || supportAt && supportAt >= number(latest.lastAt) ? 'weakRecall' : [tr, cr].some(r => outcomeClean(r) && number(r.cleanRun) >= 2 && !fresh(r.lastAt)) ? 'staleRecall' : !number(typed.right) ? 'newRecall' : 'practiceRecall';
      }
    } else {
      // Legacy streaks are useful only when there is no newer instrumentation. A lifetime
      // right count alone cannot promote, and old recognition cannot erase a typed lapse.
      const legacyHintAt = t => number(t.hinted) && number(t.lastExposure) >= number(t.lastAttempt) ? number(t.lastExposure) : 0;
      const legacySupportAt = Math.max(legacyHintAt(typed), legacyHintAt(choice));
      const clearOfSupport = t => !legacySupportAt || number(t.lastAttempt) > legacySupportAt;
      const legacyClean = t => number(t.right) > 0 && number(t.streak) > 0 && !legacyHintAt(t);
      const typedBad = miss(typed), choiceBad = miss(choice);
      const latestBad = Math.max(typedBad ? number(typed.lastAttempt) : 0, choiceBad ? number(choice.lastAttempt) : 0);
      if (due(item, kind, now) && legacyClean(typed) && clearOfSupport(typed) && !choiceBad && number(typed.lastAttempt) >= latestBad) {
        answerFormat = 'typed'; reasonKey = 'dueRecall';
      } else if (!typedBad && legacyClean(choice) && clearOfSupport(choice) && number(choice.streak) >= 2 && number(choice.right) >= 2 && fresh(choice.lastAttempt) && number(choice.lastAttempt) >= latestBad) {
        answerFormat = 'typed'; reasonKey = 'recognitionReady';
      } else if (!choiceBad && legacyClean(typed) && clearOfSupport(typed) && number(typed.streak) >= 2 && number(typed.right) >= 2 && fresh(typed.lastAttempt) && number(typed.lastAttempt) >= latestBad) {
        answerFormat = 'typed'; reasonKey = 'recallReady';
      } else {
        supportRecommended = [typed, choice].some(t => miss(t) && !number(t.right) && number(t.wrong) >= 2);
        reasonKey = supportRecommended ? 'supportRecall' : typedBad || choiceBad || legacySupportAt ? 'weakRecall' : [typed, choice].some(t => legacyClean(t) && number(t.streak) >= 2 && !fresh(t.lastAttempt)) ? 'staleRecall' : !number(typed.right) && !number(typed.wrong) ? 'newRecall' : 'practiceRecall';
      }
    }
    return { answerFormat, reasonKey, supportRecommended };
  }
  function struggling(item, kind, now, fluency) {
    return ['weakRecall', 'supportRecall'].includes(chooseDifficulty({ item, kind, now, fluency }).reasonKey);
  }
  function weak(item, kind, now, fluency) {
    const t = stat(item, kind);
    return (miss(t) || struggling(item, kind, now, fluency) ? -5 : 0) - Math.min(number(t.confidentMisses), 3) + (due(item, kind, now) ? -2 : 0) + Math.min(number(t.streak), 3);
  }
  function guided(item, now, fluency) {
    return (number(item.level) < 2 && !number(stat(item, 'structure').right)) || miss(stat(item, 'structure')) || miss(stat(item, 'forge')) || struggling(item, 'structure', now, fluency);
  }
  function buildPlan({ items, now = Date.now(), random = Math.random, fluency } = {}) {
    if (!Array.isArray(items) || !Number.isFinite(now) || typeof random !== 'function') throw new TypeError('Invalid quest planning input');
    const seen = new Set();
    const pool = items.filter(x => object(x) && CODES.has(x.code) && !seen.has(x.code) && seen.add(x.code)).map((x, index) => {
      const r = random();
      return { ...x, tie: Number.isFinite(r) ? r : index / 20 };
    });
    if (pool.length < 6) throw new TypeError('A quest needs at least six different amino acids');
    const used = new Set(), remaining = [...RECALL], queue = [];
    function recallStage(item, kind) {
      const { answerFormat, reasonKey } = chooseDifficulty({ item, kind, now, fluency });
      return { code: item.code, kind, reasonKey, answerFormat };
    }
    function add(stage) { used.add(stage.code); queue.push(stage); const i = remaining.indexOf(stage.kind); if (i >= 0) remaining.splice(i, 1); }
    const duePairs = pool.flatMap(item => RECALL.filter(kind => due(item, kind, now)).map(kind => ({ item, kind })));
    duePairs.sort((a, b) => number(stat(a.item, a.kind).nextDue) - number(stat(b.item, b.kind).nextDue) || weak(a.item, a.kind, now, fluency) - weak(b.item, b.kind, now, fluency) || a.item.tie - b.item.tie);
    if (duePairs.length) add(recallStage(duePairs[0].item, duePairs[0].kind));
    if (!queue.length && !pool.some(item => guided(item, now, fluency))) {
      const pairs = pool.flatMap(item => RECALL.map(kind => ({ item, kind })));
      pairs.sort((a, b) => weak(a.item, a.kind, now, fluency) - weak(b.item, b.kind, now, fluency) || number(stat(a.item, a.kind).right) - number(stat(b.item, b.kind).right) || a.item.tie - b.item.tie);
      add(recallStage(pairs[0].item, pairs[0].kind));
    }
    // Reserve the structure/build weakness, then a familiar drawing target, before recall allocation.
    const buildItem = pool.filter(x => !used.has(x.code)).sort((a, b) => {
      const rank = x => miss(stat(x, 'structure')) || miss(stat(x, 'forge')) || struggling(x, 'structure', now, fluency) ? 0 : guided(x, now, fluency) ? 1 : 2;
      return rank(a) - rank(b) || number(a.level) - number(b.level) || number(stat(a, 'forge').right) - number(stat(b, 'forge').right) || a.tie - b.tie;
    })[0];
    const drawItem = pool.filter(x => !used.has(x.code) && x.code !== buildItem.code).sort((a, b) => (number(b.level) >= 2) - (number(a.level) >= 2) || (miss(stat(b, 'draw')) ? 1 : 0) - (miss(stat(a, 'draw')) ? 1 : 0) || number(stat(a, 'draw').right) - number(stat(b, 'draw').right) || a.tie - b.tie)[0];
    const needsGuidance = guided(buildItem, now, fluency);
    const buildWeak = miss(stat(buildItem, 'structure')) || miss(stat(buildItem, 'forge')) || struggling(buildItem, 'structure', now, fluency);
    const forgeStage = { code: buildItem.code, kind: 'forge', reasonKey: needsGuidance ? (buildWeak ? 'guidedWeak' : 'guidedNew') : 'challengeBuild', forgeMode: needsGuidance ? 'guided' : 'challenge' };
    function nextRecall() {
      const pairs = pool.filter(x => !used.has(x.code) && x.code !== drawItem.code && x.code !== buildItem.code).flatMap(item => remaining.map(kind => ({ item, kind })));
      pairs.sort((a, b) => Number(due(b.item, b.kind, now)) - Number(due(a.item, a.kind, now)) || weak(a.item, a.kind, now, fluency) - weak(b.item, b.kind, now, fluency) || number(stat(a.item, a.kind).right) - number(stat(b.item, b.kind).right) || a.item.tie - b.item.tie);
      add(recallStage(pairs[0].item, pairs[0].kind));
    }
    add(forgeStage);
    while (queue.length < 3) nextRecall();
    add({ code: drawItem.code, kind: 'draw', reasonKey: number(drawItem.level) >= 2 ? 'familiarDraw' : 'blankDraw' });
    while (remaining.length) nextRecall();
    return queue;
  }
  function reasonText(stage) {
    const reason = Object.hasOwn(REASONS, stage?.reasonKey) ? REASONS[stage.reasonKey] : 'Mix a different skill with a fresh amino acid. Practice results guide later choices.';
    return reason + (RECALL.includes(stage?.kind) ? stage.answerFormat === 'choice' ? ' Four choices first.' : ' Hard mode: recall without options.' : '');
  }
  function defaultCurrent(kind) {
    return { assisted: kind === 'draw', hintStage: 0, confidence: null, input: '', answered: false, correct: null, forgeRun: null, paths: [], scaffold: kind === 'draw', shown: false, referenceSeen: false, answerFormat: null, optionIds: [], choiceViewed: false, responseTimer: null, pendingDrawRating: null, earlyReference: false };
  }
  function validateRun(raw, { validateForge, validateTimer } = {}) {
    try {
      if (!object(raw) || raw.version !== 1 || !Array.isArray(raw.queue) || raw.queue.length !== 6 || !integer(raw.index, 0, 6) || typeof raw.paused !== 'boolean' || typeof raw.complete !== 'boolean' || raw.complete !== (raw.index === 6) || (raw.complete && raw.paused) || !integer(raw.rewardStart, 0, 10000)) return null;
      const queue = [], codes = new Set(), kinds = new Set();
      for (const s of raw.queue) {
        if (!object(s) || !CODES.has(s.code) || !KINDS.includes(s.kind) || codes.has(s.code) || kinds.has(s.kind) || !Object.hasOwn(REASONS, s.reasonKey)) return null;
        const validReason = s.kind === 'forge' ? ['guidedNew', 'guidedWeak', 'challengeBuild'] : s.kind === 'draw' ? ['familiarDraw', 'blankDraw'] : ['dueRecall', 'weakRecall', 'newRecall', 'practiceRecall', 'recognitionReady', 'recallReady', 'supportRecall', 'staleRecall'];
        if (!validReason.includes(s.reasonKey)) return null;
        const stage = { code: s.code, kind: s.kind, reasonKey: s.reasonKey };
        if (RECALL.includes(s.kind)) {
          if (s.answerFormat !== undefined && !['choice', 'typed'].includes(s.answerFormat)) return null;
          stage.answerFormat = s.answerFormat === undefined ? 'typed' : s.answerFormat;
          if (stage.reasonKey === 'dueRecall' && stage.answerFormat !== 'typed') return null;
          if (['recognitionReady', 'recallReady'].includes(stage.reasonKey) && stage.answerFormat !== 'typed') return null;
          if (['supportRecall', 'staleRecall'].includes(stage.reasonKey) && stage.answerFormat !== 'choice') return null;
        } else if (s.answerFormat !== undefined && s.answerFormat !== null) return null;
        if (s.kind === 'forge') {
          if (!['guided', 'challenge'].includes(s.forgeMode) || (s.reasonKey === 'challengeBuild') !== (s.forgeMode === 'challenge')) return null;
          stage.forgeMode = s.forgeMode;
        } else if (s.forgeMode !== undefined) return null;
        codes.add(s.code); kinds.add(s.kind); queue.push(stage);
      }
      const c = object(raw.current) ? { ...raw.current } : raw.current, active = queue[Math.min(raw.index, 5)];
      if (!object(c) || !['assisted', 'answered', 'scaffold', 'shown'].every(k => typeof c[k] === 'boolean') || !integer(c.hintStage, 0, 3) || ![null, 'unsure', 'think', 'know'].includes(c.confidence) || typeof c.input !== 'string' || c.input.length > 200 || (c.answered ? typeof c.correct !== 'boolean' : c.correct !== null) || (c.hintStage > 0 && !c.assisted) || (c.scaffold && !c.assisted) || (raw.complete && !c.answered)) return null;
      if (c.referenceSeen !== undefined && typeof c.referenceSeen !== 'boolean') return null;
      // Old unfinished drawings did not distinguish early help from final comparison.
      // Preserve the attempt, but never infer an independent success from missing provenance.
      if (active.kind === 'draw' && !c.answered && c.earlyReference === undefined && (c.referenceSeen === true || c.shown === true)) {
        c.earlyReference = true;
        c.assisted = true;
        if (c.pendingDrawRating === true) c.pendingDrawRating = null;
      }
      const referenceSeen = c.referenceSeen === true;
      const pendingDrawRating = c.pendingDrawRating === undefined ? null : c.pendingDrawRating;
      if (pendingDrawRating !== null && (typeof pendingDrawRating !== 'boolean' || active.kind !== 'draw' || c.answered)) return null;
      const earlyReference = c.earlyReference === undefined ? false : c.earlyReference;
      if (typeof earlyReference !== 'boolean' || (earlyReference && (active.kind !== 'draw' || !c.assisted || pendingDrawRating === true || c.correct === true))) return null;
      const answerFormat = c.answerFormat === undefined ? null : c.answerFormat, optionIds = c.optionIds === undefined ? [] : c.optionIds, choiceViewed = c.choiceViewed === undefined ? false : c.choiceViewed;
      // Legacy five/six-option snapshots load before the UI prunes to four, retaining exposure.
      if (![null, 'choice', 'typed'].includes(answerFormat) || typeof choiceViewed !== 'boolean' || !Array.isArray(optionIds) || ![0, 4, 5, 6].includes(optionIds.length) || (optionIds.length && (new Set(optionIds).size !== optionIds.length || optionIds.some(code => !CODES.has(code)) || !optionIds.includes(active.code))) || (choiceViewed && ![4, 5, 6].includes(optionIds.length))) return null;
      const effectiveFormat = answerFormat || active.answerFormat;
      if (!RECALL.includes(active.kind)) {
        if (answerFormat !== null || optionIds.length || choiceViewed) return null;
      } else {
        if ((effectiveFormat === 'typed' && choiceViewed && !c.assisted) || (active.answerFormat === 'typed' && effectiveFormat === 'choice' && !c.assisted)) return null;
      }
      if (!Array.isArray(c.paths) || c.paths.length > 100) return null;
      let pointCount = 0;
      const paths = [];
      for (const stroke of c.paths) {
        if (!Array.isArray(stroke) || !stroke.length || stroke.length > 5000 || (pointCount += stroke.length) > 5000) return null;
        const path = [];
        for (const p of stroke) {
          if (!Array.isArray(p) || p.length !== 2 || !integer(p[0], 0, 1100) || !integer(p[1], 0, 600)) return null;
          path.push([p[0], p[1]]);
        }
        paths.push(path);
      }
      if (active.kind !== 'draw' && (paths.length || c.scaffold || c.shown || referenceSeen)) return null;
      if (!RECALL.includes(active.kind) && (c.hintStage || c.input || c.confidence !== null)) return null;
      let responseTimer = null;
      if (c.responseTimer !== undefined && c.responseTimer !== null) {
        if (typeof validateTimer !== 'function') return null;
        responseTimer = validateTimer(c.responseTimer);
        if (!responseTimer) return null;
      }
      let forgeRun = null;
      if (c.forgeRun !== null) {
        if (active.kind !== 'forge' || typeof validateForge !== 'function') return null;
        forgeRun = validateForge(c.forgeRun);
        if (!forgeRun || forgeRun.queue.length !== 1 || forgeRun.queue[0] !== active.code || forgeRun.index !== 0 || forgeRun.mode !== active.forgeMode || forgeRun.complete || forgeRun.paused) return null;
        if (c.answered !== forgeRun.finished || (forgeRun.finished && (c.correct !== true || (forgeRun.results[0]?.assisted && !c.assisted)))) return null;
      }
      if (active.kind === 'forge' && c.answered && !forgeRun) return null;
      if (!Array.isArray(raw.results) || raw.results.length !== (raw.complete ? 6 : raw.index + (c.answered ? 1 : 0))) return null;
      const results = [];
      for (let i = 0; i < raw.results.length; i++) {
        const r = raw.results[i], s = queue[i];
        if (!object(r) || r.code !== s.code || r.kind !== s.kind || !['correct', 'assisted', 'selfRated', 'skipped'].every(k => typeof r[k] === 'boolean') || r.selfRated !== (s.kind === 'draw') || (r.skipped && r.correct)) return null;
        const delayed = r.delayed === undefined ? false : r.delayed, gained = r.gained === undefined ? 0 : r.gained;
        const recognition = r.recognition === undefined ? false : r.recognition;
        const maxGain = s.kind === 'draw' ? 0 : s.kind === 'forge' || recognition ? 2 : 20;
        if (typeof recognition !== 'boolean' || (recognition && (!RECALL.includes(s.kind) || delayed)) || typeof delayed !== 'boolean' || !integer(gained, 0, maxGain) || ((r.assisted || !r.correct || r.skipped) && gained !== 0) || (delayed && (!RECALL.includes(s.kind) || !r.correct || r.assisted || r.skipped)) || (s.kind === 'forge' && s.forgeMode === 'guided' && !r.assisted && !r.skipped)) return null;
        results.push({ code: s.code, kind: s.kind, correct: r.correct, assisted: r.assisted, selfRated: r.selfRated, skipped: r.skipped, delayed, gained, recognition });
      }
      if (c.answered) {
        const last = results[results.length - 1];
        if (!last || last.correct !== c.correct || last.assisted !== c.assisted || (RECALL.includes(active.kind) && (last.recognition !== (effectiveFormat === 'choice') || (last.recognition && !choiceViewed)))) return null;
      }
      const current = { assisted: c.assisted, hintStage: c.hintStage, confidence: c.confidence, input: c.input, answered: c.answered, correct: c.correct, forgeRun, paths, scaffold: c.scaffold, shown: c.shown, referenceSeen, answerFormat, optionIds: [...optionIds], choiceViewed, responseTimer, pendingDrawRating, earlyReference };
      return { version: 1, queue, index: raw.index, paused: raw.paused, complete: raw.complete, results, current, rewardStart: raw.rewardStart };
    } catch (_) { return null; }
  }
  const api = { buildPlan, chooseDifficulty, reasonText, defaultCurrent, validateRun };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.AminoQuestEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
