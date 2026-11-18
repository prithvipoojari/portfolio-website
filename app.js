/* ========================================================================
   APP — renders USER_DATA (data.js) into one continuous Pip-Boy style
   terminal page:
     - full-width pinned top bar (name · section tabs · date and time)
     - bordered section cards: the card you're leaving stays put while the
       next one slides up over it, and the old card shrinks back, fades and
       dissolves into 1s and 0s (reversed when scrolling back; "matrix off"
       in the terminal disables it)
     - a side rail with one progress segment per card
     - copy-to-clipboard buttons next to every link
     - guidance: a short how-to line in the intro and "Next: …" links
     - reticle cursor and target-lock brackets (mouse only)
     - a slide-up terminal console
   ======================================================================== */

const D = USER_DATA;
const root = document.documentElement;
const $  = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

const SECTIONS = ["about", "experience", "projects", "skills", "contact"];   // page order
const THEMES   = ["white", "amber", "green", "blue", "neon"];                 // first one is the default

const matches       = (query) => window.matchMedia(query).matches;
const reducedMotion = () => matches("(prefers-reduced-motion: reduce)");
const finePointer   = () => matches("(hover: hover) and (pointer: fine)");
const isNarrow      = () => matches("(max-width: 560px)");
const MOTION        = !reducedMotion();   // card transitions need motion; otherwise plain scrolling

let appReady = false;


// == HELPERS ==========================================
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
  }[c]));
}

const hasOwn    = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const clamp     = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const pad2      = (n) => String(n).padStart(2, "0");
const titleCase = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const isTyping  = (el) => el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || Boolean(el && el.isContentEditable);

// mailto: links open in place; sites and the resume open in a new tab
function link(url, label, cls = "") {
  const newTab = url.startsWith("mailto:") ? "" : ' target="_blank" rel="noopener"';
  return `<a href="${esc(url)}"${cls ? ` class="${cls}"` : ""}${newTab}>${esc(label)}</a>`;
}

function contactUrl(label) {
  const c = D.contact.find(c => c.label.toLowerCase() === label);
  return c ? c.url : null;
}

const store = {
  get(key)        { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* storage unavailable */ } },
};

// small integer hash: stable pseudo-random numbers for the binary pattern
function hashInt(a, b, c = 0) {
  let h = Math.imul(a + 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35) ^ Math.imul(c + 0x27d4eb2f, 0x165667b1);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12; h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return h >>> 0;
}

// document y of an element's top edge from the layout (ignores transforms)
function docTop(el) {
  let y = 0;
  for (let n = el; n; n = n.offsetParent) y += n.offsetTop + (n.offsetParent ? n.offsetParent.clientTop : 0);
  return y;
}


// == COPY TO CLIPBOARD ==========================================
const ICON_COPY = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="5.5" y="5.5" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10.5 3.5v-1h-8v8h1" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
const ICON_DONE = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3.2L13 5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';

// email links copy the bare address; everything else copies the URL
const copyValue = (url) => (url.startsWith("mailto:") ? url.slice(7) : url);

function copyButton(url, name, { text = false } = {}) {
  const what = url.startsWith("mailto:") ? `${name} address` : `${name} link`;
  return `<button type="button" class="copy-btn" data-copy="${esc(copyValue(url))}" aria-label="Copy ${esc(what)}" title="Copy ${esc(what)}">` +
    `<span class="ic-copy">${ICON_COPY}</span><span class="ic-done">${ICON_DONE}</span>` +
    `${text ? '<span class="copy-label" aria-hidden="true"></span>' : ""}</button>`;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // older browsers / insecure pages: copy through a temporary text field
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.cssText = "position:fixed;top:0;left:0;opacity:0";
    document.body.append(field);
    field.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { /* not supported */ }
    field.remove();
    return ok;
  }
}

const toastEl = $("#toast");
let toastTimer = 0;
function showToast(title, detail = "") {
  const b = document.createElement("b");
  b.textContent = title;
  toastEl.replaceChildren(b, " ", detail);
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2000);
}

document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-copy]");
  if (!btn) return;
  const value = btn.dataset.copy;
  const ok = await copyText(value);
  if (!ok) return showToast("Couldn't copy", "press and hold the link to copy it instead");
  showToast("Copied", value);
  btn.classList.add("copied");
  clearTimeout(btn.copiedTimer);
  btn.copiedTimer = setTimeout(() => btn.classList.remove("copied"), 1600);
});


// == RENDERERS ==========================================
function renderShell() {
  $("#brand").textContent = D.name;
  $("#status-left").innerHTML = `<span class="dot" aria-hidden="true"></span><span class="status-text">${esc(D.availability)}</span>`;
  $("#year").textContent = new Date().getFullYear();
}

function renderAbout() {
  // intro buttons: each link joined with its copy button
  const heroLinks = [
    ...(D.resume ? [{ url: D.resume, label: "Resume ↗", name: "Resume", cls: "btn primary" }] : []),
    ...D.contact.filter(c => c.hero !== false).map(c => ({ url: c.url, label: c.label, name: c.label, cls: "btn" })),
  ];
  const buttons = heroLinks.map(l => `<span class="btn-group">${link(l.url, l.label, l.cls)}${copyButton(l.url, l.name)}</span>`).join("");
  const nameParts = D.shortName.split(/\s+/);
  const idTag = `ID://${nameParts[0].charAt(0)}.${nameParts[nameParts.length - 1]}`;
  // "Open to … · Spring & Summer 2027": on phones the term moves to its own line instead of wrapping after the dot
  const [availMain, availTerm] = D.availability.split(" · ");
  const avail = availTerm
    ? `${esc(availMain)}<span class="avail-sep"> · </span><span class="avail-term">${esc(availTerm)}</span>`
    : esc(availMain);

  $("#about").innerHTML = `
    <div class="about">
      <figure class="photo-frame">
        <img src="${esc(D.photo)}" alt="Portrait of ${esc(D.shortName)}" width="400" height="400" />
        <figcaption class="photo-id" aria-hidden="true"><span>${esc(idTag)}</span><span>Verified</span></figcaption>
      </figure>
      <div>
        <p class="kicker" aria-hidden="true">&gt; whoami</p>
        <h1 class="name">${esc(D.name)}</h1>
        <p class="headline">${esc(D.headline)}</p>
        <p class="focus">${esc(D.focus)}</p>
        <p class="avail"><span class="dot" aria-hidden="true"></span><span>${avail}</span></p>
        <p class="bio">${esc(D.bio)}</p>
        <div class="actions">${buttons}</div>
        <p class="hint">
          <span class="arrow" aria-hidden="true">↓</span>
          <span class="for-mouse">Scroll to explore, or jump to a section from the bar at the top.
            Keys <kbd>1</kbd>–<kbd>5</kbd> work too, and <kbd>/</kbd> opens the terminal.</span>
          <span class="for-touch">Scroll to explore, or tap a section in the bar at the top to jump straight there.</span>
        </p>
      </div>
    </div>
    <section class="card" data-label="At a glance">
      <dl class="facts">
        ${D.facts.map(f => `<dt>${esc(f.label)}</dt><dd>${f.url ? link(f.url, f.value) + copyButton(f.url, f.linkName || f.label) : esc(f.value)}</dd>`).join("")}
      </dl>
    </section>`;
}

function entry({ title, sub, dates, items }) {
  const current = /present/i.test(dates);
  return `
    <article class="entry${current ? " current" : ""}">
      <header class="entry-head">
        <div>
          <h4 class="entry-title">${esc(title)}</h4>
          <p class="entry-org">${esc(sub)}</p>
        </div>
        <p class="entry-dates">${esc(dates)}</p>
      </header>
      ${items && items.length ? `<ul class="bullets">${items.map(i => `<li>${esc(i)}</li>`).join("")}</ul>` : ""}
    </article>`;
}

function renderExperience() {
  $("#experience-list").innerHTML = `
    <h3 class="section-label">Work</h3>
    <div class="timeline">
      ${D.experience.map(e => entry({ title: e.role, sub: `${e.org} · ${e.location}`, dates: e.dates, items: e.bullets })).join("")}
    </div>
    <h3 class="section-label">Education</h3>
    <div class="timeline">
      ${D.education.map(e => entry({ title: e.degree, sub: `${e.school} · ${e.location}`, dates: e.dates, items: e.details })).join("")}
    </div>`;
}

function renderProjects() {
  $("#project-list").innerHTML = D.projects.map((p, i) => {
    const active = p.status === "active";
    return `
      <article class="card project" data-label="Project ${pad2(i + 1)}">
        <header class="project-head">
          <h3 class="project-name">${esc(p.name)}</h3>
          <div class="project-badges">
            ${p.badge ? `<span class="pill bright">${esc(p.badge)}</span>` : ""}
            <span class="pill${active ? " solid" : ""}">${active ? "In progress" : "Completed"}</span>
          </div>
        </header>
        <p class="project-tagline">${esc(p.tagline)}</p>
        <p class="project-summary">${esc(p.summary)}</p>
        ${p.metrics && p.metrics.length ? `
          <ul class="metrics">
            ${p.metrics.map(m => `<li><b>${esc(m.value)}</b><span>${esc(m.label)}</span></li>`).join("")}
          </ul>` : ""}
        <ul class="tags" aria-label="Technologies">${p.tags.map(t => `<li>${esc(t)}</li>`).join("")}</ul>
        ${p.links && p.links.length ? `<p class="links">${p.links.map(l =>
          `<span class="link-item">${link(l.url, `${l.label} ↗`)}${copyButton(l.url, `${p.name} ${l.label}`)}</span>`).join("")}</p>` : ""}
      </article>`;
  }).join("");
}

function renderSkills() {
  $("#skills-list").innerHTML = `
    <div class="skills-grid">
      ${D.skills.map(g => `
        <section class="card" data-label="${esc(g.group)}">
          <ul class="chips">${g.items.map(s => `<li>${esc(s)}</li>`).join("")}</ul>
        </section>`).join("")}
    </div>
    <section class="card" data-label="Professional">
      <ul class="strengths">
        ${D.strengths.map(s => `<li><b>${esc(s.name)}</b><span>${esc(s.desc)}</span></li>`).join("")}
      </ul>
    </section>`;
}

function renderContact() {
  const rows = D.resume ? [...D.contact, { label: "Resume", value: "View PDF ↗", url: D.resume }] : D.contact;
  $("#contact-channels").innerHTML = `
    <section class="card" data-label="Channels">
      <ul class="contact-list">
        ${rows.map(c => `
          <li>
            <span class="k">${esc(c.label)}</span>
            ${link(c.url, c.value)}
            ${copyButton(c.url, c.label, { text: true })}
          </li>`).join("")}
      </ul>
    </section>`;
}

// "Next: Projects ↓" at the end of every section but the last
function renderNextLinks() {
  sectionEls.forEach((section, i) => {
    const next = SECTIONS[i + 1];
    if (!next) return;
    section.insertAdjacentHTML("beforeend",
      `<a class="next-link" href="#${next}">Next: ${titleCase(next)}<span class="arrow" aria-hidden="true">↓</span></a>`);
  });
}


// == CARD STACK ==========================================
// Each section is a bordered sticky card. A card pins once it's fully on screen (tall cards
// pin when their bottom edge arrives), and the next card slides up over it. As it's covered,
// the old card shrinks back, fades and its words flip, letter by letter, into 1s and 0s
// (in the theme's contrast colour). Everything is a function of scroll position, so scrolling
// back plays it in reverse. Screen readers, copy/paste and printing still get the real text:
// the animated copy is aria-hidden and the original sits next to it in a visually hidden span.
const STEPS  = 10;                // binary levels per word
const ALNUM  = /[\p{L}\p{N}]/u;   // only letters and digits flip, so line breaks never move
const sectionsEl = $("main.sections");
const sectionEls = SECTIONS.map(id => document.getElementById(id));
const cards = SECTIONS.map(() => ({ flowTop: 0, height: 0, stickTop: 0, p: 0, words: [] }));
const words = [];                 // every wrapped word, across all cards
let cardsOn = false;
let viewH = 0;                    // viewport height
let statusH = 36;                 // status bar height (incl. the iPhone home-bar area)
let cardGap = 16;                 // space between cards, and between a pinned card and the bars
let tick = 0;                     // advances to make dissolving digits flicker

function wrapWords(container) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      return node.parentElement.closest("button, .sr-only") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  for (const node of nodes) {
    const text = node.nodeValue;
    const card = cards[sectionEls.indexOf(node.parentElement.closest(".section"))];
    const visible = document.createElement("span");
    visible.setAttribute("aria-hidden", "true");
    for (const part of text.split(/(\s+)/)) {
      if (!part) continue;
      if (!part.trim()) { visible.append(part); continue; }
      const span = document.createElement("span");
      span.className = "w";
      span.textContent = part;
      visible.append(span);
      const w = { el: span, text: part, chars: null, order: null, level: 0, id: words.length, r: 0 };
      w.r = hashInt(w.id, 13) / 4294967296;   // when this word starts to flip, relative to the others
      words.push(w);
      if (card) card.words.push(w);
    }
    if (node.parentElement.closest('[aria-hidden="true"]')) {
      node.replaceWith(visible);
    } else {
      const original = document.createElement("span");
      original.className = "sr-only";
      original.textContent = text;
      node.replaceWith(visible, original);
    }
  }
}

function binaryText(w) {
  if (!w.chars) {
    w.chars = Array.from(w.text);
    w.order = w.chars.map((c, i) => i)
      .filter(i => ALNUM.test(w.chars[i]))
      .sort((a, b) => hashInt(w.id, a, 7) - hashInt(w.id, b, 7));   // random but stable flip order
  }
  const out = w.chars.slice();
  const flips = Math.ceil((w.order.length * w.level) / STEPS);
  for (let k = 0; k < flips; k++) {
    const i = w.order[k];
    out[i] = hashInt(w.id, i, tick) & 1 ? "1" : "0";
  }
  return out.join("");
}

function render(w) {
  if (w.level > 0) {
    w.el.textContent = binaryText(w);
    w.el.classList.add("bin");
  } else {
    w.el.textContent = w.text;
    w.el.classList.remove("bin");
  }
}

function setLevel(w, level) {
  if (w.level === level) return;
  w.level = level;
  render(w);
}

// staggered so the dissolve spreads through the card: each word flips over its own stretch of
// the transition (starting anywhere in the first 60%); every word is binary once fully covered
const wordLevel = (w, p) => Math.round(clamp((p - w.r * 0.6) / 0.4, 0, 1) * STEPS);

// card positions from the layout (offsetTop/offsetHeight ignore sticking and transforms)
function measureCards() {
  viewH = root.clientHeight;   // stable on phones while the browser toolbar slides in and out
  statusH = $(".statusbar").offsetHeight;
  cardGap = parseFloat(getComputedStyle(sectionsEl).paddingTop) || 0;
  const bottom = viewH - statusH - cardGap;
  let y = sectionsEl.offsetTop + cardGap;
  cards.forEach((c, i) => {
    c.flowTop = y;
    c.height = sectionEls[i].offsetHeight;
    y += c.height + cardGap;
    // short cards pin just under the top bar; tall ones pin when their bottom edge arrives
    c.stickTop = Math.round(Math.min(navH + cardGap, bottom - c.height));
    sectionEls[i].style.top = cardsOn ? `${c.stickTop}px` : "";
  });
}

// where a card's bottom edge sits once it's pinned
const pinnedBottom = (c) => c.stickTop + c.height;

// p = how far the next card has slid over this one: 0 = not at all, 1 = completely
function setCardProgress(i, p) {
  const c = cards[i];
  if (Math.abs(c.p - p) < 0.001) return;
  c.p = p;
  const el = sectionEls[i];
  if (p === 0) {
    el.style.transform = el.style.opacity = el.style.transformOrigin = "";
  } else {
    // shrink toward the middle of what's on screen, so tall cards don't lurch
    const originY = (navH + cardGap + pinnedBottom(c)) / 2 - c.stickTop;
    el.style.transformOrigin = `50% ${Math.round(originY)}px`;
    el.style.transform = `scale(${(1 - 0.05 * p).toFixed(4)})`;
    el.style.opacity = (1 - p * p).toFixed(3);
  }
  for (const w of c.words) setLevel(w, wordLevel(w, p));
}

function cardsUpdate() {
  if (!cardsOn || !appReady) return;
  const y = window.scrollY;
  const top = navH + cardGap;
  for (let i = 0; i < cards.length - 1; i++) {
    const c = cards[i];
    const nextTop = cards[i + 1].flowTop - y;   // the next card's top edge on screen
    // coverage = how far the next card has slid over this one (not just whether it's visible below it)
    setCardProgress(i, clamp((pinnedBottom(c) - nextTop) / Math.max(1, pinnedBottom(c) - top), 0, 1));
  }
}

function resetCards() {
  cards.forEach((c, i) => { c.p = -1; setCardProgress(i, 0); });
}

function setCards(on, save = true) {
  cardsOn = Boolean(on) && MOTION;
  if (save) store.set("cards", cardsOn ? "on" : "off");
  root.classList.toggle("stack", cardsOn);
  if (cardsOn && !words.length) wrapWords(sectionsEl);
  if (!cardsOn) resetCards();
  relayout();
}

// digits flicker while a card is mid-dissolve
setInterval(() => {
  if (!cardsOn || !appReady || document.hidden) return;
  tick++;
  for (const c of cards) {
    if (c.p > 0 && c.p < 1) for (const w of c.words) if (w.level > 0) render(w);
  }
}, 120);

// keyboard users: tabbing into a card that's covered scrolls back so the focused element shows
document.addEventListener("focusin", (e) => {
  if (!cardsOn || !e.target.closest) return;
  const section = e.target.closest(".section");
  const i = sectionEls.indexOf(section);
  if (i < 0 || e.target === section || cards[i].p < 0.02) return;
  const elY = cards[i].flowTop + (docTop(e.target) - docTop(section));
  const y = Math.max(0, Math.min(cards[i + 1].flowTop - pinnedBottom(cards[i]), elY - navH - cardGap - 24));
  lockedId = null;
  jump(behavior => window.scrollTo({ top: y, behavior }));
});

// printing gets the real text and flat cards
window.addEventListener("beforeprint", resetCards);
window.addEventListener("afterprint", () => { cards.forEach(c => { c.p = -1; }); cardsUpdate(); });


// == SIDE RAIL (one progress segment per card) ==========================================
const railEl = $("#rail");
let railFills = [];
const railProgress = [];

function renderRail() {
  railEl.innerHTML = SECTIONS.map((id, i) =>
    `<button type="button" class="seg" data-section="${id}" tabindex="-1" title="${esc(titleCase(id))}">` +
    `<span class="fill"></span><span class="lbl">${pad2(i + 1)}</span></button>`).join("");
  railFills = $$(".fill", railEl);
}

// how much of each card has come into view: fills as you read down through a tall card,
// and completes as soon as a short card is fully on screen
function updateRail() {
  if (!appReady) return;
  const y = window.scrollY;
  const readBottom = viewH - statusH - cardGap;
  cards.forEach((c, i) => {
    const r = c.height ? clamp((readBottom - (c.flowTop - y)) / c.height, 0, 1) : 0;
    if (Math.abs((railProgress[i] ?? -1) - r) < 0.002) return;
    railProgress[i] = r;
    railFills[i].style.transform = `scaleY(${r.toFixed(4)})`;
  });
}

railEl.addEventListener("click", (e) => {
  const seg = e.target.closest(".seg");
  if (seg) scrollToSection(seg.dataset.section);
});


// == TOP BAR NAV & SCROLL SPY ==========================================
const navEl    = $("#topbar");
const tabsEl   = $("#tabs");
const navLinks = SECTIONS.map(id => tabsEl.querySelector(`[data-section="${id}"]`));
const statusEl = $("#status-section");

let activeId = null;
let lockedId = null;   // section a jump is heading to; manual scrolling releases it
let ticking  = false;
let navH = 44;         // height of the pinned top bar

function setActive(id) {
  if (id === activeId) return;
  activeId = id;
  const index = SECTIONS.indexOf(id);
  navLinks.forEach((a, i) => {
    a.classList.toggle("active", i === index);
    if (i === index) a.setAttribute("aria-current", "true");
    else a.removeAttribute("aria-current");
  });
  sectionEls.forEach((s, i) => s.classList.toggle("is-active", i === index));
  $$(".seg", railEl).forEach((s, i) => s.classList.toggle("active", i === index));
  statusEl.innerHTML = `${pad2(index + 1)}/${pad2(SECTIONS.length)}<span class="sec-label"> · ${esc(titleCase(id))}</span>`;
  keepTabVisible(navLinks[index]);
  // keep the URL shareable: prithvipoojari.com/#projects opens at Projects
  history.replaceState(null, "", index === 0 ? location.pathname + location.search : `#${id}`);
}

function updateScrollState() {
  if (!appReady) return;
  const max = root.scrollHeight - window.innerHeight;
  const y = window.scrollY;
  let id = lockedId;
  if (!id) {
    // the current section is the last one whose top has passed a line ~1/3 down the screen
    // (using layout positions, so pinned cards don't confuse it); at the very bottom of the
    // page the last section wins even if it's short
    const line = window.innerHeight * 0.35;
    id = SECTIONS[0];
    cards.forEach((c, i) => { if (c.flowTop - y <= line) id = SECTIONS[i]; });
    if (max > 0 && y >= max - 2) id = SECTIONS[SECTIONS.length - 1];
  }
  setActive(id);
}

// one animation frame per scroll
function frame() {
  ticking = false;
  updateScrollState();
  placeLock();
  cardsUpdate();
  updateRail();
}

function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(frame);
}

// where to scroll so a section's card sits just under the top bar
const sectionTop = (index) => (index === 0 ? 0 : Math.max(0, cards[index].flowTop - navH - cardGap));

function scrollToSection(id, { instant = false } = {}) {
  const index = SECTIONS.indexOf(id);
  if (index < 0) return false;
  lockedId = id;
  const go = (behavior) => window.scrollTo({ top: sectionTop(index), behavior });
  if (!instant && !reducedMotion()) go("smooth");
  else jump(go);
  updateScrollState();
  return true;
}

// scroll instantly even though the page has CSS smooth scrolling
function jump(scroll) {
  try {
    scroll("instant");
  } catch {
    // browsers that don't know "instant": switch smooth scrolling off for the call
    const prev = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    void getComputedStyle(root).scrollBehavior;   // apply the style before scrolling
    scroll("auto");
    root.style.scrollBehavior = prev;
  }
}

// if the tab strip ever has to scroll sideways, keep the active tab in view
function keepTabVisible(tab) {
  if (!tab || tabsEl.scrollWidth <= tabsEl.clientWidth) return;
  const left = tab.offsetLeft;
  const right = left + tab.offsetWidth;
  if (left >= tabsEl.scrollLeft && right <= tabsEl.scrollLeft + tabsEl.clientWidth) return;
  tabsEl.scrollTo({ left: left - (tabsEl.clientWidth - tab.offsetWidth) / 2, behavior: reducedMotion() ? "auto" : "smooth" });
}

function measureNav() {
  navH = navEl.offsetHeight;
  root.style.setProperty("--nav-h", `${navH}px`);
}

// re-measure after resizes and font loads
function relayout() {
  measureNav();
  measureCards();
  // still parked on a section from a jump or deep link? keep it aligned as the layout shifts
  if (appReady && lockedId) scrollToSection(lockedId, { instant: true });
  onScroll();
}
let relayoutTimer = 0;
const scheduleRelayout = () => { clearTimeout(relayoutTimer); relayoutTimer = setTimeout(relayout, 120); };

// phones resize the viewport a little whenever the browser toolbar slides in or out;
// only re-measure for real changes (rotation, window resize, on-screen keyboard)
let lastW = window.innerWidth, lastH = window.innerHeight;
window.addEventListener("resize", () => {
  onScroll();
  const w = window.innerWidth, h = window.innerHeight;
  if (w !== lastW || Math.abs(h - lastH) > 120) { lastW = w; lastH = h; scheduleRelayout(); }
});
window.addEventListener("scroll", onScroll, { passive: true });
if ("ResizeObserver" in window) {
  const ro = new ResizeObserver(scheduleRelayout);
  ro.observe(sectionsEl);
  ro.observe(navEl);
}

// any manual scrolling hands control back to the scroll spy
const releaseLock = () => { lockedId = null; };
for (const type of ["wheel", "touchstart", "mousedown"]) {
  window.addEventListener(type, releaseLock, { passive: true });
}
const SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "]);
window.addEventListener("keydown", (e) => {
  if (SCROLL_KEYS.has(e.key) && !isTyping(e.target)) releaseLock();
});

// in-page links (tabs, name, "Next", back to top) glide to their section without piling up history entries
document.addEventListener("click", (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute("href").slice(1);
  if (!SECTIONS.includes(id)) return;
  e.preventDefault();
  scrollToSection(id);
  document.getElementById(id).focus({ preventScroll: true });   // keyboard users continue from there
});

window.addEventListener("hashchange", () => {
  scrollToSection(location.hash.slice(1) || SECTIONS[0]);
});


// == RETICLE CURSOR & TARGET-LOCK BRACKETS (mouse only) ==========================================
const cssVar = (name) => getComputedStyle(root).getPropertyValue(name).trim();
const svgUrl = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, " "))}")`;

// 32×32 cursor drawn in the theme colour with a dark outline: crosshair, or corner brackets over links
function reticle(color, pointer) {
  const shade = 'stroke="#000" stroke-opacity="0.75"';
  const marks = pointer ? "M5 11V5h6M21 5h6v6M27 21v6h-6M11 27H5v-6" : "M16 3v7M16 22v7M3 16h7M22 16h7";
  const core = pointer
    ? `<path d="M16 11.5l4.5 4.5-4.5 4.5-4.5-4.5z" fill="${color}" ${shade}/>`
    : `<rect x="14.5" y="14.5" width="3" height="3" fill="${color}" ${shade}/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <path d="${marks}" fill="none" stroke-width="4" ${shade}/>
    <path d="${marks}" fill="none" stroke-width="2" stroke="${color}"/>
    ${core}
  </svg>`;
}

function updateCursor() {
  root.style.setProperty("--cur-default", `${svgUrl(reticle(cssVar("--fg"), false))} 16 16, crosshair`);
  root.style.setProperty("--cur-pointer", `${svgUrl(reticle(cssVar("--accent"), true))} 16 16, pointer`);
}

const lockEl = $("#lock");
let lockTarget = null;

function placeLock() {
  if (!lockTarget) return;
  const r = lockTarget.getBoundingClientRect();
  const pad = 4;
  lockEl.style.left = `${r.left - pad}px`;
  lockEl.style.top = `${r.top - pad}px`;
  lockEl.style.width = `${r.width + pad * 2}px`;
  lockEl.style.height = `${r.height + pad * 2}px`;
}

function hideLock() {
  lockTarget = null;
  lockEl.classList.remove("on");
}

document.addEventListener("pointerover", (e) => {
  if (e.pointerType !== "mouse") return;
  const target = e.target.closest("a, button:not(.seg)");   // the side rail's thin segments don't get brackets
  if (target === lockTarget) return;
  if (!target) return hideLock();
  const wasOn = lockTarget !== null;
  lockTarget = target;
  if (!wasOn) {
    // appear in place instead of flying in from wherever it was last
    lockEl.style.transition = "none";
    placeLock();
    void lockEl.offsetWidth;
    lockEl.style.transition = "";
  } else {
    placeLock();   // glide from the previous target
  }
  lockEl.classList.add("on");
});
root.addEventListener("pointerleave", hideLock);


// == CLOCK (the visitor's local date and time) ==========================================
function tickClock() {
  const now = new Date();
  const date = now.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  $("#clock").innerHTML = `<span class="clock-date">${esc(date)}</span><span class="clock-sep"> · </span><span class="clock-time">${esc(time)}</span>`;
}


// == THEME ==========================================
const themeBtn = $("#theme-btn");
const currentTheme = () => root.dataset.theme || THEMES[0];

function setTheme(name, save = true) {
  if (!THEMES.includes(name)) return false;
  if (name === THEMES[0]) delete root.dataset.theme;
  else root.dataset.theme = name;
  themeBtn.innerHTML = `<span class="theme-label">Theme: </span>${esc(name)}`;
  updateCursor();
  if (save) store.set("theme", name);
  requestAnimationFrame(placeLock);   // the button's width may have changed
  return true;
}

themeBtn.addEventListener("click", () => {
  setTheme(THEMES[(THEMES.indexOf(currentTheme()) + 1) % THEMES.length]);
});


// == TERMINAL CONSOLE ==========================================
const consoleEl  = $("#console");
const termToggle = $("#term-toggle");
const termOut    = $("#term-out");
const termIn     = $("#term-input");
const PROMPT     = $(".term-prompt").textContent;
const cmdHistory = [];
let histIdx = 0;

const consoleIsOpen = () => root.classList.contains("console-open");

// focus only with a mouse/keyboard; on phones, wait for a tap so the keyboard doesn't pop up
function openConsole({ focus = finePointer() } = {}) {
  root.classList.add("console-open");
  consoleEl.inert = false;
  termToggle.setAttribute("aria-expanded", "true");
  if (focus) termIn.focus({ preventScroll: true });
}

function closeConsole({ restoreFocus = false } = {}) {
  root.classList.remove("console-open");
  consoleEl.inert = true;
  termToggle.setAttribute("aria-expanded", "false");
  if (lockTarget && consoleEl.contains(lockTarget)) hideLock();
  if (restoreFocus) termToggle.focus({ preventScroll: true });
}

termToggle.addEventListener("click", () => {
  if (consoleIsOpen()) closeConsole();
  else openConsole();
});
$("#console-close").addEventListener("click", () => closeConsole({ restoreFocus: true }));

// clicking anywhere in the console focuses the input (unless selecting text or pressing a button)
consoleEl.addEventListener("click", (e) => {
  if (e.target.closest("button") || String(window.getSelection())) return;
  termIn.focus({ preventScroll: true });
});

function termPrint(text = "", cls = "") {
  const line = document.createElement("div");
  line.className = cls ? `line ${cls}` : "line";
  line.textContent = text;
  termOut.appendChild(line);
  termOut.scrollTop = termOut.scrollHeight;
}

const pad = (s, n) => String(s).padEnd(n);

const FILES = {
  "about.txt":      () => CMD.about(),
  "experience.txt": () => CMD.experience(),
  "education.txt":  () => CMD.education(),
  "projects.txt":   () => CMD.projects(),
  "skills.txt":     () => CMD.skills(),
  "contact.txt":    () => CMD.contact(),
  "resume.pdf":     () => CMD.resume(),
};

function openTargets() {
  return {
    github:   contactUrl("github"),
    linkedin: contactUrl("linkedin"),
    email:    contactUrl("email"),
    resume:   D.resume,
  };
}

const CMD = {
  help() {
    termPrint("Available commands:", "hl");
    [
      ["about",          "who I am"],
      ["experience",     "work history"],
      ["education",      "degrees"],
      ["projects",       "selected projects"],
      ["skills",         "technical skills"],
      ["contact",        "how to reach me"],
      ["resume",         "open my resume (PDF)"],
      ["open <target>",  "github | linkedin | email | resume"],
      ["goto <section>", SECTIONS.join(" | ")],
      ["theme <name>",   THEMES.join(" | ")],
      ["matrix on|off",  "sections dissolve into 1s and 0s as the next one slides in"],
      ["ls, cat <file>", "browse files"],
      ["history, clear", "terminal housekeeping"],
      ["exit",           "close the terminal"],
    ].forEach(([c, d]) => termPrint(`  ${pad(c, 17)}${d}`));
    if (finePointer()) termPrint("Tip: Tab autocompletes, ↑/↓ recall commands, Esc closes.", "dim");
  },

  about() {
    termPrint(`${D.name} — ${D.headline}`, "hl");
    termPrint(D.focus);
    termPrint(`● ${D.availability}`);
    termPrint(D.bio);
  },

  whoami() { CMD.about(); },

  experience() {
    D.experience.forEach(e => {
      termPrint(`${pad(e.dates, 22)}${e.role}`, "hl");
      termPrint(`${pad("", 22)}${e.org} · ${e.location}`);
    });
    termPrint("→ full details: goto experience", "dim");
  },

  education() {
    D.education.forEach(e => {
      termPrint(`${pad(e.dates, 22)}${e.degree}`, "hl");
      termPrint(`${pad("", 22)}${e.school}`);
    });
  },

  projects() {
    D.projects.forEach(p => {
      termPrint(`${p.status === "active" ? "[WIP] " : "[DONE]"} ${p.name} — ${p.tagline}`, "hl");
      (p.links || []).forEach(l => termPrint(`       ${l.label}: ${l.url}`));
    });
    termPrint("→ full details: goto projects", "dim");
  },

  skills() {
    D.skills.forEach(g => termPrint(`${pad(g.group, 15)}${g.items.join(", ")}`));
  },

  contact() {
    D.contact.forEach(c => termPrint(`  ${pad(c.label, 16)}${c.value}`));
    if (D.resume) termPrint(`  ${pad("Resume", 16)}type 'resume' to open the PDF`);
  },

  resume() { CMD.open("resume"); },

  open(arg = "") {
    const targets = openTargets();
    const key = arg.toLowerCase();
    if (!hasOwn(targets, key) || !targets[key]) {
      return termPrint(`open: choose one of ${Object.keys(targets).join(", ")}`, "warn");
    }
    termPrint(`opening ${key}...`, "hl");
    if (targets[key].startsWith("mailto:")) location.href = targets[key];
    else window.open(targets[key], "_blank", "noopener");
  },

  goto(arg = "") {
    const t = arg.toLowerCase().replace(/\/+$/, "");
    const id = ["", "~", "/", "..", "home", "top"].includes(t) ? SECTIONS[0] : t;
    if (!SECTIONS.includes(id)) {
      return termPrint(`goto: unknown section '${arg}'. try: ${SECTIONS.join(", ")}`, "err");
    }
    termPrint(`→ ${id}`, "hl");
    scrollToSection(id);
    if (isNarrow()) closeConsole();   // on phones the console covers too much of the page
  },

  ls() { termPrint(Object.keys(FILES).join("   "), "hl"); },

  cat(arg = "") {
    if (!arg) return termPrint("usage: cat <file>   (try 'ls')", "warn");
    const key = arg.toLowerCase();
    if (!hasOwn(FILES, key)) return termPrint(`cat: ${arg}: no such file`, "err");
    FILES[key]();
  },

  theme(arg = "") {
    const t = arg.toLowerCase();
    if (!setTheme(t)) return termPrint(`theme: choose one of ${THEMES.join(", ")}`, "warn");
    termPrint(`theme set to ${t}`, "hl");
  },

  matrix(arg = "") {
    if (!MOTION) return termPrint("matrix: off because this device is set to reduce motion", "warn");
    const a = arg.toLowerCase();
    if (a && a !== "on" && a !== "off") return termPrint("usage: matrix on | matrix off", "warn");
    const on = a ? a === "on" : !cardsOn;
    setCards(on);
    termPrint(on
      ? "matrix on: sections dissolve into 1s and 0s as the next one slides in."
      : "matrix off: plain scrolling. 'matrix on' brings the transitions back.", "hl");
  },

  history() { cmdHistory.forEach((c, i) => termPrint(`  ${String(i + 1).padStart(3)}  ${c}`)); },

  clear() { termOut.replaceChildren(); },

  date() { termPrint(new Date().toString(), "hl"); },

  sudo() { termPrint("guest is not in the sudoers file. This incident will be reported.", "err"); },

  exit() {
    termPrint("logout", "dim");
    closeConsole({ restoreFocus: true });
  },
};
CMD.cd  = CMD.goto;
CMD.man = CMD.help;
CMD.dir = CMD.ls;

// argument completion for commands that take one
const ARG_OPTIONS = {
  goto:   () => SECTIONS,
  cd:     () => SECTIONS,
  theme:  () => THEMES,
  matrix: () => ["on", "off"],
  cat:    () => Object.keys(FILES),
  open:   () => Object.keys(openTargets()),
};

function run(raw) {
  const line = raw.trim();
  if (!line) return;
  termPrint(`${PROMPT} ${line}`, "cmd");
  const [cmd, ...rest] = line.split(/\s+/);
  const name = cmd.toLowerCase();
  if (!hasOwn(CMD, name)) return termPrint(`command not found: ${cmd}. type 'help'`, "err");
  try { CMD[name](rest.join(" ")); }
  catch (err) { termPrint(`error: ${err.message}`, "err"); }
}

function complete(value) {
  const parts = value.trimStart().split(/\s+/);
  const pick = (options, partial, build) => {
    const found = options.filter(o => o.startsWith(partial.toLowerCase()));
    if (found.length === 1) return build(found[0]);
    if (found.length > 1) termPrint(found.join("   "), "dim");
    return value;
  };
  if (parts.length === 1) return pick(Object.keys(CMD), parts[0], m => `${m} `);
  const cmd = parts[0].toLowerCase();
  if (!hasOwn(ARG_OPTIONS, cmd)) return value;
  return pick(ARG_OPTIONS[cmd](), parts.slice(1).join(" "), m => `${parts[0]} ${m}`);
}

termIn.addEventListener("keydown", (e) => {
  switch (e.key) {
    case "Enter": {
      const value = termIn.value;
      if (value.trim()) cmdHistory.push(value.trim());
      histIdx = cmdHistory.length;
      termIn.value = "";
      run(value);
      break;
    }
    case "ArrowUp":
      e.preventDefault();
      if (histIdx > 0) termIn.value = cmdHistory[--histIdx];
      break;
    case "ArrowDown":
      e.preventDefault();
      if (histIdx < cmdHistory.length) termIn.value = cmdHistory[++histIdx] || "";
      break;
    case "Tab":
      // complete when there's something typed; otherwise let Tab move focus as usual
      if (e.shiftKey || !termIn.value.trim()) return;
      e.preventDefault();
      termIn.value = complete(termIn.value);
      break;
  }
});


// == GLOBAL HOTKEYS ==========================================
window.addEventListener("keydown", (e) => {
  if (!appReady || e.ctrlKey || e.metaKey || e.altKey) return;

  if (e.key === "Escape") {
    if (consoleIsOpen()) closeConsole({ restoreFocus: consoleEl.contains(document.activeElement) });
    return;
  }
  if (isTyping(e.target)) return;

  const n = Number(e.key);
  if (e.key === "/") {
    e.preventDefault();
    openConsole({ focus: true });
  } else if (Number.isInteger(n) && n >= 1 && n <= SECTIONS.length) {
    scrollToSection(SECTIONS[n - 1]);
  }
});


// == BOOT SEQUENCE (first visit per tab) ==========================================
const BOOT_STEPS = [
  { text: "PP-OS v3.0 · portfolio terminal" },
  { text: `(c) ${new Date().getFullYear()} ${D.name}`, cls: "dim" },
  { text: "" },
  { text: "> establishing uplink ............ OK" },
  { text: "> verifying signature ............ OK" },
  { hex: 3 },
  { progress: "> decrypting profile  " },
  { text: "> mounting /experience ........... OK" },
  { text: "> mounting /projects ............. OK" },
  { text: "" },
  { text: "ACCESS GRANTED", cls: "granted", pause: 520 },
];

const bootEl = $("#boot");
const bootListeners = new AbortController();
let bootDone = false;
let bootTimer = null;

function hexDump() {
  const byte = () => ((Math.random() * 256) | 0).toString(16).padStart(2, "0");
  const addr = ((Math.random() * 0xffffff) | 0).toString(16).padStart(6, "0");
  return `  0x${addr}  ${Array.from({ length: 12 }, byte).join(" ")}`;
}

async function runBoot() {
  if (root.classList.contains("no-boot")) return showApp();

  // any key or tap skips ahead
  for (const type of ["keydown", "pointerdown"]) {
    window.addEventListener(type, finishBoot, { signal: bootListeners.signal });
  }

  const content = $("#boot-content");
  const addLine = (text = "", cls = "") => {
    const el = document.createElement("div");
    el.className = cls ? `boot-line ${cls}` : "boot-line";
    el.textContent = text || " ";
    content.append(el);
    return el;
  };
  const wait = (ms) => new Promise(resolve => { bootTimer = setTimeout(resolve, ms); });

  for (const step of BOOT_STEPS) {
    if (bootDone) return;
    if (step.hex) {
      for (let i = 0; i < step.hex && !bootDone; i++) { addLine(hexDump(), "dim"); await wait(40); }
    } else if (step.progress) {
      const el = addLine(step.progress);
      for (let pct = 0; pct <= 100 && !bootDone; pct += 10) {
        const filled = pct / 5;
        el.textContent = `${step.progress}[${"█".repeat(filled)}${"░".repeat(20 - filled)}] ${String(pct).padStart(3)}%`;
        await wait(30);
      }
    } else {
      addLine(step.text, step.cls);
      await wait(step.pause ?? 60);
    }
  }
  finishBoot();
}

function finishBoot() {
  if (bootDone) return;
  bootDone = true;
  clearTimeout(bootTimer);
  bootListeners.abort();
  try { sessionStorage.setItem("booted", "1"); } catch { /* storage unavailable */ }
  bootEl.classList.add("done");
  setTimeout(() => { bootEl.hidden = true; showApp(); }, 300);
}

function showApp() {
  root.classList.add("ready");
  appReady = true;
  relayout();

  // deep link (e.g. /#projects): the page was hidden during boot, so jump there now
  const target = location.hash.slice(1);
  if (SECTIONS.includes(target) && target !== SECTIONS[0]) scrollToSection(target, { instant: true });
  else updateScrollState();
  cardsUpdate();
  updateRail();

  // web fonts change text metrics: re-measure once they've loaded (on repeat visits the page
  // renders before they've even started loading, so also listen for later loads)
  if (document.fonts) {
    document.fonts.ready.then(scheduleRelayout);
    document.fonts.addEventListener("loadingdone", scheduleRelayout);
  }
}


// == INIT ==========================================
renderShell();
renderAbout();
renderExperience();
renderProjects();
renderSkills();
renderContact();
renderNextLinks();
renderRail();
setTheme(currentTheme(), false);
setCards(store.get("cards") !== "off", false);
termPrint(`Welcome! You're browsing ${D.shortName}'s portfolio.`, "hl");
termPrint(finePointer() ? "Type 'help' for commands. Esc closes the terminal." : "Type 'help' to see what you can do here.", "dim");
tickClock();
setInterval(tickClock, 10000);
runBoot();
