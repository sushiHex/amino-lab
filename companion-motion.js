/* Cosmetic only: pause CSS sprite cycles while this tab is hidden. */
(function (root) {
  'use strict';
  if (!root || !root.document || root.AminoCompanionMotion) return;
  const document = root.document;
  function syncVisibility() {
    document.documentElement.dataset.companionMotion = document.hidden ? 'paused' : 'active';
  }
  root.AminoCompanionMotion = Object.freeze({ syncVisibility });
  document.addEventListener('visibilitychange', syncVisibility);
  syncVisibility();
})(typeof window === 'undefined' ? null : window);
