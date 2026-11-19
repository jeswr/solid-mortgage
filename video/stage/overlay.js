// AUTHORED-BY Claude Opus 5.5 (ported from the Solid Suite walkthrough recorder)
/*
 * Injected into every page during a recording. Draws what a screen recording of a real
 * person would show (a mouse pointer, click ripples) plus presentation layers: chapter
 * cards, a highlight ring and a small label. Lives in a shadow root so app styles can't
 * touch it, and never takes pointer events.
 */
(() => {
  if (window.__wt) return;
  const state = { x: -100, y: -100, queue: [] };
  let root;

  const css = `
    :host { all: initial; }
    .layer { position: fixed; inset: 0; pointer-events: none; z-index: 2147483647; font-family: "Helvetica Neue", Arial, "Liberation Sans", sans-serif; }
    .cursor { position: absolute; left: 0; top: 0; width: 26px; height: 26px; transform: translate(-100px,-100px); filter: drop-shadow(0 2px 3px rgba(0,0,0,.35)); }
    .ripple { position: absolute; width: 44px; height: 44px; margin: -22px 0 0 -22px; border-radius: 50%; border: 3px solid rgba(37,99,235,.85); background: rgba(37,99,235,.15); animation: ripple .55s ease-out forwards; }
    @keyframes ripple { from { transform: scale(.3); opacity: 1 } to { transform: scale(1.4); opacity: 0 } }
    .ring { position: absolute; border-radius: 12px; box-shadow: 0 0 0 4px rgba(249,188,38,.98), 0 0 0 9999px rgba(7,37,137,.22); transition: opacity .28s ease; opacity: 0; }
    .ring.on { opacity: 1; }
    .ring .tag { position: absolute; left: 0; top: calc(100% + 10px); background: #072589; color: #fff; font-size: 15px; font-weight: 600; padding: 7px 12px; border-radius: 8px; white-space: nowrap; }
    .card { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; padding: 0 9vw; background: #1E549E; color: #fff; opacity: 0; transition: opacity .6s ease; }
    .card.on { opacity: 1; }
    .card .eyebrow { font-size: 18px; letter-spacing: .14em; text-transform: uppercase; color: #6BF58B; font-weight: 700; margin-bottom: 18px; }
    .card .title { font-size: 56px; line-height: 1.08; font-weight: 700; max-width: 18ch; letter-spacing: -.02em; }
    .card .sub { margin-top: 22px; font-size: 22px; color: #cbd5e1; max-width: 46ch; line-height: 1.45; }
    .card .rule { width: 72px; height: 5px; border-radius: 3px; background: #6BF58B; margin-bottom: 26px; }
    .label { position: absolute; right: 18px; bottom: 18px; background: rgba(7,37,137,.92); color: #fff; font-size: 13px; padding: 8px 12px; border-radius: 8px; max-width: 520px; line-height: 1.35; opacity: 0; transition: opacity .4s; }
    .label.on { opacity: 1; }
    .chip { position: absolute; left: 18px; bottom: 18px; background: #1E549E; color: #fff; font-size: 14px; font-weight: 700; padding: 9px 14px 9px 12px; border-radius: 999px; opacity: 0; transform: translateY(8px); transition: opacity .5s, transform .5s; display: flex; align-items: center; gap: 9px; box-shadow: 0 6px 18px rgba(7,37,137,.25); }
    .chip::before { content: ''; width: 9px; height: 9px; border-radius: 50%; background: #6BF58B; }
    .chip.on { opacity: 1; transform: none; }
    .veil { position: absolute; inset: 0; background: #F4F6FA center / 100% 100% no-repeat; opacity: 0; transition: opacity .45s ease; }
    .veil.on { opacity: 1; }
  `;

  const arrow =
    '<svg viewBox="0 0 26 26" width="26" height="26"><path d="M4 2 L4 21 L9 16.5 L12.5 24 L16 22.5 L12.6 15.2 L19.5 15.2 Z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';

  function mount() {
    if (root || !document.documentElement) return;
    const host = document.createElement("div");
    host.id = "__wt-overlay";
    host.setAttribute("aria-hidden", "true");
    document.documentElement.appendChild(host);
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `<style>${css}</style><div class="layer"><div class="ring"><span class="tag" hidden></span></div><div class="label"></div><div class="chip"></div><div class="cursor">${arrow}</div><div class="card"><div class="rule"></div><div class="eyebrow"></div><div class="title"></div><div class="sub"></div></div><div class="veil"></div></div>`;
    root = shadow.querySelector(".layer");
    place();
    // A chapter card that was up when the previous page navigated away stays up, with no fade.
    const carried = readCarried();
    if (carried) showCard(carried, false);
    // A veil raised before a navigation stays up on the new page until the recorder lowers it.
    if (window.name === VEIL) root.querySelector(".veil").classList.add("on");
    // Title cards are presentation slides: no pointer on them.
    if (/cards\.html$/.test(location.pathname))
      root.querySelector(".cursor").style.visibility = "hidden";
    requestAnimationFrame(track);
    // Pages that rebuild <html> children (rare) would drop the host; put it back.
    new MutationObserver(() => {
      if (!host.isConnected) document.documentElement.appendChild(host);
    }).observe(document.documentElement, { childList: true });
  }

  function $(sel) {
    mount();
    return root?.querySelector(sel);
  }

  function place() {
    const c = root?.querySelector(".cursor");
    if (c) c.style.transform = `translate(${state.x - 4}px, ${state.y - 2}px)`;
  }

  addEventListener(
    "mousemove",
    (e) => {
      state.x = e.clientX;
      state.y = e.clientY;
      place();
    },
    true,
  );
  addEventListener(
    "mousedown",
    (e) => {
      const r = document.createElement("div");
      r.className = "ripple";
      r.style.left = `${e.clientX}px`;
      r.style.top = `${e.clientY}px`;
      $(".layer")?.appendChild(r);
      setTimeout(() => r.remove(), 700);
    },
    true,
  );

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const KEY = "__wt_card:";
  const VEIL = "__wt_veil";
  // The ringed element: the ring follows it every frame, so scrolling and reflow never leave
  // the ring behind, and a new target fades in where it is rather than gliding across.
  const ringState = { el: null, tag: "", gen: 0 };
  function placeRing() {
    const ring = root?.querySelector(".ring");
    const el = ringState.el;
    if (!ring || !el?.isConnected) return;
    const r = el.getBoundingClientRect();
    const pad = 8;
    const top = Math.max(r.top, 6);
    const bottom = Math.min(r.bottom, innerHeight - 16);
    Object.assign(ring.style, {
      left: `${r.left - pad}px`,
      top: `${top - pad}px`,
      width: `${r.width + pad * 2}px`,
      height: `${Math.max(0, bottom - top) + pad * 2}px`,
    });
  }
  function track() {
    placeRing();
    requestAnimationFrame(track);
  }

  // window.name survives same-site navigations in a tab, which is all a recording does.
  function readCarried() {
    try {
      return window.name.startsWith(KEY) ? JSON.parse(window.name.slice(KEY.length)) : null;
    } catch {
      return null;
    }
  }

  function showCard({ eyebrow = "", title = "", sub = "" }, fade = true) {
    const card = root.querySelector(".card");
    card.querySelector(".eyebrow").textContent = eyebrow;
    card.querySelector(".title").textContent = title;
    card.querySelector(".sub").textContent = sub;
    if (!fade) {
      card.style.transition = "none";
      card.classList.add("on");
      void card.offsetWidth;
      card.style.transition = "";
    } else card.classList.add("on");
    window.name = KEY + JSON.stringify({ eyebrow, title, sub });
    return card;
  }

  window.__wt = {
    setCursor(x, y) {
      state.x = x;
      state.y = y;
      mount();
      place();
    },
    async chapter(c, holdMs = 2600) {
      if (!$(".card")) return;
      const _card = showCard(c);
      if (holdMs > 0) {
        await wait(holdMs);
        await window.__wt.hideChapter();
      } else await wait(650);
    },
    async hideChapter() {
      if (window.name.startsWith(KEY)) window.name = "";
      const card = $(".card");
      if (!card?.classList.contains("on")) return;
      card.classList.remove("on");
      await wait(650);
    },
    highlightEl(el, tag) {
      const ring = $(".ring");
      if (!ring) return;
      const gen = ++ringState.gen;
      const show = () => {
        if (gen !== ringState.gen) return;
        ringState.el = el;
        const t = ring.querySelector(".tag");
        t.hidden = !tag;
        t.textContent = tag || "";
        placeRing();
        ring.classList.add("on");
      };
      if (ring.classList.contains("on") && ringState.el !== el) {
        ring.classList.remove("on");
        setTimeout(show, 200);
      } else show();
    },
    /** Covers the page with a still of the previous page, so a navigation can cross-fade. */
    async snap(src) {
      const v = $(".veil");
      if (!v) return;
      const img = new Image();
      img.src = src;
      await img.decode().catch(() => {});
      v.style.transition = "none";
      v.style.backgroundImage = `url("${src}")`;
      v.classList.add("on");
      void v.offsetWidth;
      v.style.transition = "";
    },
    async veil(on, instant = false) {
      const v = $(".veil");
      if (!v) return;
      window.name = on ? VEIL : window.name === VEIL ? "" : window.name;
      if (instant) v.style.transition = "none";
      v.classList.toggle("on", !!on);
      if (instant) {
        void v.offsetWidth;
        v.style.transition = "";
        return;
      }
      await wait(340);
    },
    highlight(rect, tag) {
      const ring = $(".ring");
      if (!ring) return;
      ringState.gen++;
      ringState.el = null;
      if (!rect) {
        ring.classList.remove("on");
        return;
      }
      const pad = 8;
      Object.assign(ring.style, {
        left: `${rect.x - pad}px`,
        top: `${rect.y - pad}px`,
        width: `${rect.width + pad * 2}px`,
        height: `${rect.height + pad * 2}px`,
      });
      const t = ring.querySelector(".tag");
      t.hidden = !tag;
      t.textContent = tag || "";
      ring.classList.add("on");
    },
    cursorVisible(on) {
      const c = $(".cursor");
      if (c) c.style.visibility = on ? "" : "hidden";
    },
    chip(text) {
      const c = $(".chip");
      if (!c) return;
      if (text) c.textContent = text;
      c.classList.toggle("on", !!text);
    },
    label(text) {
      const l = $(".label");
      if (!l) return;
      l.textContent = text || "";
      l.classList.toggle("on", !!text);
    },
  };

  // Mount straight away (before the page paints) so a carried card never flickers.
  if (document.documentElement) mount();
  else document.addEventListener("DOMContentLoaded", mount, { once: true });
})();
