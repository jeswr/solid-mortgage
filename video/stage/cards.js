// AUTHORED-BY Claude Opus 5.5 (ported from the Solid Suite walkthrough cards)
// Slide control for video/<demo>/cards.html: window.cards.show(id, step, instant) cross-fades to
// a slide and reveals its items up to `step`, one after another; window.cards.step(n) reveals
// more of the slide already up. Items carry class "in" and an optional data-step.
(() => {
  let cur = null;
  let curStep = 0;
  const stepOf = (el) => Number(el.dataset.step ?? el.closest("[data-step]")?.dataset.step ?? 0);
  const items = () => [...cur.querySelectorAll(".in")];

  function show(id, step = 0, instant = false) {
    if (cur && cur.id === id && cur.classList.contains("on")) return stepTo(step);
    for (const s of document.querySelectorAll(".slide")) s.classList.toggle("on", s.id === id);
    cur = document.getElementById(id);
    if (!cur) return;
    curStep = step;
    if (instant) {
      for (const el of items()) el.style.transition = "none";
      for (const el of items()) el.classList.toggle("shown", stepOf(el) <= step);
      void cur.offsetWidth;
      for (const el of items()) el.style.transition = "";
      return;
    }
    for (const el of items()) el.classList.remove("shown");
    let i = 0;
    for (const el of items())
      if (stepOf(el) <= step) setTimeout(() => el.classList.add("shown"), 350 + 140 * i++);
  }
  function stepTo(n) {
    if (n > curStep) step(n);
  }
  function step(n) {
    curStep = n;
    const next = items().filter((el) => !el.classList.contains("shown") && stepOf(el) <= n);
    for (const [i, el] of next.entries()) setTimeout(() => el.classList.add("shown"), 110 * i);
  }
  window.cards = { show, step };
  addEventListener("hashchange", () => show(location.hash.slice(1) || "title"));
  show(location.hash.slice(1) || "title");
})();
