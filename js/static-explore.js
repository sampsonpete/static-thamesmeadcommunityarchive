/* Static replacement for the archive's server-side filters and search.
   Every item card is already in the page; this shows the ones matching
   ?theme= &date= &location= &format= &q= and pages through them 48 at a time. */
(function () {
  var FILTERS = ['theme', 'date', 'location', 'format', 'keyword'];
  var KEYWORDS = window.TCA_KEYWORDS || {};
  var PAGE = 48;
  var form = document.getElementById('filters-form');
  var countEl = document.getElementById('static-count');
  var emptyEl = document.getElementById('static-empty');
  var moreBtn = document.getElementById('static-more');
  var byId = {};
  (window.TCA_INDEX || []).forEach(function (it) { byId[it.s] = it; });
  var cards = Array.prototype.slice.call(document.querySelectorAll('[data-item]'));
  var matches = [];
  var shown = 0;
  var current = {};

  function readParams() {
    var params = new URLSearchParams(window.location.search);
    var state = { q: (params.get('q') || '').trim() };
    FILTERS.forEach(function (f) { state[f] = params.get(f) || ''; });
    return state;
  }

  // keyword has no dropdown (it arrives from item page tag links), so it carries over from the current state
  function readForm() {
    var state = { q: form.elements.q ? form.elements.q.value.trim() : '' };
    FILTERS.forEach(function (f) { state[f] = form.elements[f] ? form.elements[f].value : current[f]; });
    return state;
  }

  function syncForm(state) {
    FILTERS.forEach(function (f) {
      var sel = form.elements[f];
      if (!sel) return;
      if (state[f] && sel.querySelector('option[value="' + state[f] + '"]')) sel.value = state[f];
      else sel.selectedIndex = 0;
    });
    if (form.elements.q) form.elements.q.value = state.q;
    document.querySelectorAll('input.search-field[name="q"]').forEach(function (i) { i.value = state.q; });
  }

  function matchesState(it, state, words) {
    if (!it) return false;
    for (var i = 0; i < FILTERS.length; i++) {
      var f = FILTERS[i];
      if (state[f] && it[f].indexOf(state[f]) === -1) return false;
    }
    for (var j = 0; j < words.length; j++) {
      if (it.x.indexOf(words[j]) === -1 && it.t.toLowerCase().indexOf(words[j]) === -1) return false;
    }
    return true;
  }

  function nudgeLazyImages() {
    if (window.lazySizes && window.lazySizes.loader) window.lazySizes.loader.checkElems();
    window.dispatchEvent(new Event('scroll'));
  }

  function render() {
    cards.forEach(function (c) { c.hidden = true; });
    matches.slice(0, shown).forEach(function (c) { c.hidden = false; });
    // style.display rather than the hidden attribute: the site's .button class would override it
    moreBtn.style.display = shown >= matches.length ? 'none' : '';
    emptyEl.style.display = matches.length > 0 ? 'none' : '';
    if (countEl) {
      var text = matches.length + (matches.length === 1 ? ' item' : ' items');
      if (current.keyword) text += ' tagged “' + (KEYWORDS[current.keyword] || current.keyword) + '”';
      countEl.textContent = text;
    }
    nudgeLazyImages();
  }

  function apply(state) {
    current = state;
    var words = state.q.toLowerCase().split(/\s+/).filter(Boolean);
    matches = cards.filter(function (c) { return matchesState(byId[c.getAttribute('data-item')], state, words); });
    shown = PAGE;
    render();
  }

  function toQuery(state) {
    var params = new URLSearchParams();
    FILTERS.concat('q').forEach(function (f) { if (state[f]) params.set(f, state[f]); });
    var s = params.toString();
    return window.location.pathname + (s ? '?' + s : '');
  }

  if (!form || !cards.length) return;

  // Capture phase, so the site bundle's own listener (which submits the form) never sees the change.
  window.addEventListener('change', function (e) {
    if (!form.contains(e.target)) return;
    e.stopPropagation();
    var state = readForm();
    history.replaceState(null, '', toQuery(state));
    apply(state);
  }, true);
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var state = readForm();
    history.replaceState(null, '', toQuery(state));
    apply(state);
  });
  moreBtn.addEventListener('click', function () { shown += PAGE; render(); });

  var initial = readParams();
  syncForm(initial);
  apply(initial);
})();
