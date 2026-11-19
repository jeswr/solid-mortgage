// AUTHORED-BY Claude Opus 5.5
/**
 * "Do it for me" (design.md §d.6): a visible cursor moves to the step's `data-tour` target and
 * clicks it. The click is the element's own `click()`, so the app does the real work; nothing
 * is faked.
 */

const SIZE = 28;

function reducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export interface ActOptions {
  /** How long to wait for the target to appear and be enabled. */
  timeoutMs?: number;
  doc?: Document;
}

export class TourCursor {
  private host: HTMLElement | undefined;
  private dot: HTMLElement | undefined;
  private x = -100;
  private y = -100;

  private ensure(doc: Document): HTMLElement {
    if (this.dot && this.host?.isConnected) return this.dot;
    const host = doc.createElement("div");
    host.setAttribute("data-tour-cursor", "");
    host.setAttribute("aria-hidden", "true");
    const root = host.attachShadow({ mode: "open" });
    const style = doc.createElement("style");
    style.textContent = `
      :host { all: initial; position: fixed; inset: 0; pointer-events: none; z-index: 2147483600; }
      .c { position: absolute; left: 0; top: 0; width: ${SIZE}px; height: ${SIZE}px; opacity: 0; transition: opacity 150ms; }
      .c.on { opacity: 1; }
      .c svg { filter: drop-shadow(0 2px 3px rgb(0 0 0 / 0.35)); }
      .ring { position: absolute; left: -9px; top: -9px; width: 18px; height: 18px; border-radius: 50%; border: 3px solid #4f3a8f; opacity: 0; }
      .ring.go { animation: ring 450ms ease-out 1; }
      @keyframes ring { from { opacity: 0.9; transform: scale(0.4); } to { opacity: 0; transform: scale(1.8); } }
      @media (prefers-reduced-motion: reduce) { .ring.go { animation: none; } }
    `;
    const dot = doc.createElement("div");
    dot.className = "c";
    dot.innerHTML =
      '<span class="ring"></span><svg width="28" height="28" viewBox="0 0 28 28"><path d="M4 2l18 10-8 2.4-3.6 8z" fill="#fff" stroke="#17202a" stroke-width="2" stroke-linejoin="round"/></svg>';
    root.append(style, dot);
    doc.body.append(host);
    this.host = host;
    this.dot = dot;
    return dot;
  }

  /** Move to the centre of `el` (animated unless reduced motion), then click it. */
  async clickElement(el: HTMLElement, doc: Document = document): Promise<void> {
    el.scrollIntoView({ block: "center", inline: "nearest" });
    const dot = this.ensure(doc);
    const r = el.getBoundingClientRect();
    const tx = r.left + r.width / 2;
    const ty = r.top + r.height / 2;
    dot.classList.add("on");
    if (this.x < 0) {
      this.x = Math.max(0, tx - 160);
      this.y = Math.max(0, ty + 120);
    }
    const from = `translate(${this.x}px, ${this.y}px)`;
    const to = `translate(${tx}px, ${ty}px)`;
    dot.style.transform = to;
    if (!reducedMotion() && typeof dot.animate === "function") {
      await dot
        .animate([{ transform: from }, { transform: to }], {
          duration: 650,
          easing: "cubic-bezier(.3,.7,.3,1)",
        })
        .finished.catch(() => undefined);
    }
    this.x = tx;
    this.y = ty;
    const ring = dot.querySelector(".ring");
    ring?.classList.remove("go");
    void (ring as HTMLElement | null)?.offsetWidth;
    ring?.classList.add("go");
    el.focus({ preventScroll: true });
    el.click();
    setTimeout(() => dot.classList.remove("on"), 900);
  }

  remove(): void {
    this.host?.remove();
    this.host = undefined;
    this.dot = undefined;
  }
}

/** Wait for `[data-tour="<name>"]` to exist and be enabled. */
export async function waitForTarget(name: string, opts: ActOptions = {}): Promise<HTMLElement> {
  const doc = opts.doc ?? document;
  const deadline = Date.now() + (opts.timeoutMs ?? 10_000);
  const selector = `[data-tour="${CSS.escape(name)}"]`;
  for (;;) {
    const el = doc.querySelector<HTMLElement>(selector);
    const disabled =
      el && (el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true");
    if (el && !disabled) return el;
    if (Date.now() > deadline) {
      throw new Error(
        el
          ? `tour target "${name}" stayed disabled`
          : `tour target "${name}" not found on this page`,
      );
    }
    await new Promise((r) => setTimeout(r, 100));
  }
}
