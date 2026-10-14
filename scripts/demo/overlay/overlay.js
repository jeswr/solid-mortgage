/*
 * Demo overlay, injected into every page by the local demo gateway (scripts/demo/gateway.ts).
 *
 *  - Guided steps: a card that walks the visitor through the journey across the apps,
 *    highlights the button to press, and can press it for them ("Do it for me").
 *  - Pod activity: a sidebar (or a pop-out window at /__demo/activity) listing every read,
 *    write and access-rule change that reaches the borrower's pod, live.
 *
 * Rendered inside a shadow root so the apps' styles and the overlay's never mix.
 * Plain browser JavaScript: no build step.
 */
(() => {
  if (window.__solidDemoOverlay) return;
  window.__solidDemoOverlay = true;

  const STORE = "solid-demo:";
  const read = (key, fallback) => {
    try {
      const raw = localStorage.getItem(STORE + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  };
  const write = (key, value) => {
    try {
      localStorage.setItem(STORE + key, JSON.stringify(value));
    } catch {
      // storage unavailable: state just won't persist
    }
  };

  const standalone = location.pathname === "/__demo/activity";
  // Hand-off between apps: each app is its own origin (own storage), so the guided step
  // and the panel state travel in the URL and are stripped again on arrival.
  const params = new URLSearchParams(location.search);
  if (params.get("guided") === "1") write("guided", { active: true, index: 0 });
  const handedStep = Number.parseInt(params.get("demo-step") ?? "", 10);
  if (Number.isInteger(handedStep) && handedStep >= 0) {
    write("guided", { active: true, index: handedStep });
  }
  if (params.has("demo-panel")) write("sidebar", params.get("demo-panel") === "1");
  if (params.has("guided") || params.has("demo-step") || params.has("demo-panel")) {
    for (const key of ["guided", "demo-step", "demo-panel"]) params.delete(key);
    const rest = params.toString();
    history.replaceState(
      history.state,
      "",
      `${location.pathname}${rest ? `?${rest}` : ""}${location.hash}`,
    );
  }

  const el = (tag, attrs = {}, ...children) => {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value === undefined || value === false) continue;
      if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
      else if (key === "class") node.className = value;
      else node.setAttribute(key, value === true ? "" : value);
    }
    for (const child of children.flat()) {
      if (child === undefined || child === null || child === false) continue;
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return node;
  };

  const KIND_LABEL = {
    read: "Read",
    write: "Write",
    delete: "Delete",
    access: "Permission change",
    auth: "Sign-in",
    info: "Setup",
  };
  const FILTERS = [
    ["all", "All"],
    ["read", "Reads"],
    ["write", "Writes"],
    ["access", "Permissions"],
    ["auth", "Sign-ins"],
  ];

  const css = `
    :host { all: initial; }
    * { box-sizing: border-box; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
    [hidden] { display: none !important; }
    button { font: inherit; cursor: pointer; }
    /* Unguided, the dock is one compact "Demo" pill in the bottom-right corner that opens a
       short menu; pageStyle reserves space under the page so it never covers the end of the
       page's content. Only the pills take clicks, never the empty area around them. */
    .dock { position: fixed; right: 12px; bottom: 12px; z-index: 2147483000; display: flex; flex-direction: column;
      align-items: flex-end; gap: 6px; pointer-events: none; }
    .dock > *, .dock-menu > * { pointer-events: auto; }
    .dock-menu { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
    .dock.collapsed .dock-menu { display: none; }
    .dock .pill { padding: 6px 12px; font-size: 12px; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
    .pill { text-decoration: none; display: inline-flex; align-items: center; gap: 8px; border: 1px solid #1e293b; background: #0f172a; color: #f8fafc;
      border-radius: 999px; padding: 8px 14px; font-size: 13px; font-weight: 600; box-shadow: 0 6px 20px rgb(15 23 42 / .25); }
    .pill.light { background: #fff; color: #0f172a; border-color: #cbd5e1; }
    .pill:focus-visible, .btn:focus-visible, .chip:focus-visible { outline: 3px solid #f59e0b; outline-offset: 2px; }
    .badge { background: #f59e0b; color: #0f172a; border-radius: 999px; padding: 0 7px; font-size: 11px; min-width: 20px; text-align: center; }

    .sidebar { position: fixed; top: 0; right: 0; bottom: 0; width: min(420px, 100vw); z-index: 2147483001; background: #fff;
      color: #0f172a; border-left: 1px solid #e2e8f0; box-shadow: -12px 0 32px rgb(15 23 42 / .18); display: flex; flex-direction: column;
      transform: translateX(105%); visibility: hidden; transition: transform .2s ease, visibility .2s; }
    .sidebar.open { transform: none; visibility: visible; }
    .standalone { position: fixed; inset: 0; }
    .standalone .sidebar { width: 100%; transform: none; visibility: visible; box-shadow: none; border: 0; }
    header.side { padding: 16px 16px 8px; border-bottom: 1px solid #e2e8f0; }
    header.side h2 { margin: 0; font-size: 16px; }
    header.side p { margin: 4px 0 0; font-size: 12px; color: #475569; line-height: 1.4; }
    .row { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
    .spread { justify-content: space-between; }
    .btn { border: 1px solid #cbd5e1; background: #fff; color: #0f172a; border-radius: 8px; padding: 5px 10px; font-size: 12px; font-weight: 600; }
    .btn.primary { background: #0f172a; color: #fff; border-color: #0f172a; }
    .btn[disabled] { opacity: .45; cursor: default; }
    .chip { border: 1px solid #cbd5e1; background: #f8fafc; border-radius: 999px; padding: 3px 10px; font-size: 12px; color: #334155; }
    .chip[aria-pressed="true"] { background: #0f172a; color: #fff; border-color: #0f172a; }
    .filters { padding: 8px 16px; border-bottom: 1px solid #e2e8f0; }
    ol.events { list-style: none; margin: 0; padding: 8px 12px 16px; overflow-y: auto; flex: 1; }
    li.event { border: 1px solid #e2e8f0; border-left-width: 4px; border-radius: 8px; padding: 8px 10px; margin: 6px 0; font-size: 13px; line-height: 1.35; }
    li.event.fresh { animation: flash 1.2s ease; }
    @keyframes flash { from { background: #fef3c7; } }
    li.read { border-left-color: #0284c7; }
    li.write { border-left-color: #16a34a; }
    li.delete { border-left-color: #dc2626; }
    li.access { border-left-color: #b45309; background: #fffbeb; }
    li.auth { border-left-color: #7c3aed; }
    li.info { border-left-color: #64748b; }
    .meta { display: flex; gap: 6px; flex-wrap: wrap; font-size: 11px; color: #475569; margin-top: 4px; }
    .times { font-weight: 600; color: #334155; }
    details.tech { margin-top: 4px; font-size: 11px; color: #475569; }
    details.tech summary { cursor: pointer; }
    details.tech[open] summary { margin-bottom: 2px; }
    .kind { font-weight: 700; text-transform: uppercase; letter-spacing: .03em; font-size: 10px; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; color: #334155; word-break: break-all; }
    ul.rules { margin: 6px 0 0; padding-left: 18px; font-size: 12px; }
    ul.rules li.granted::marker { content: "+ "; color: #15803d; font-weight: 700; }
    ul.rules li.revoked::marker { content: "− "; color: #b91c1c; font-weight: 700; }
    ul.rules li.kept::marker { content: "· "; color: #64748b; }
    ul.rules li.revoked { text-decoration: line-through; color: #7f1d1d; }
    .empty { color: #475569; font-size: 13px; padding: 16px; list-style: none; }
    footer.side { border-top: 1px solid #e2e8f0; padding: 10px 16px 14px; font-size: 12px; color: #475569; line-height: 1.4; }
    footer.side label { display: flex; gap: 8px; align-items: center; font-weight: 600; color: #0f172a; }

    .guide { position: fixed; right: 16px; bottom: 16px; z-index: 2147483000; width: min(360px, calc(100vw - 32px)); background: #0f172a;
      color: #f8fafc; border-radius: 12px; padding: 12px 14px; box-shadow: 0 12px 32px rgb(15 23 42 / .35); font-size: 13px; line-height: 1.45;
      max-height: calc(100vh - 140px); overflow-y: auto; }
    .guide.shifted { right: min(436px, calc(100vw - 376px)); }
    .guide .scene { font-size: 11px; color: #fbbf24; font-weight: 700; }
    .guide .count { font-size: 11px; color: #cbd5e1; white-space: nowrap; }
    .guide h3 { margin: 2px 0 4px; font-size: 15px; }
    .guide p { margin: 0 0 6px; color: #e2e8f0; }
    .guide .todo { background: #1e293b; border-radius: 8px; padding: 6px 10px; margin: 6px 0; }
    .guide .todo strong { color: #fbbf24; }
    .guide .done { color: #86efac; font-weight: 700; }
    .guide .watch { font-size: 12px; color: #cbd5e1; border-left: 3px solid #f59e0b; padding-left: 8px; margin: 4px 0 6px; }
    .guide .progress { height: 3px; background: #334155; border-radius: 3px; margin: 8px 0; overflow: hidden; }
    .guide .progress span { display: block; height: 100%; background: #f59e0b; }
    .guide .btn { background: #1e293b; color: #f8fafc; border-color: #475569; }
    .guide .btn.primary { background: #f59e0b; color: #0f172a; border-color: #f59e0b; }
    .guide .link { background: none; border: 0; color: #fbbf24; text-decoration: underline; font-size: 12px; padding: 0; }
    .guide a.btn { display: inline-block; text-decoration: none; }
    .guide .links { margin: 6px 0; }
    /* Narrower screens: the guide is a band across the top, and pageStyle pushes the page down
       by its height (--solid-demo-guide-h), so the guide sits above the content, not over it. */
    @media (max-width: 1199px) {
      .guide { top: 0; left: 0; right: 0; bottom: auto; width: auto; border-radius: 0 0 12px 12px; max-height: 50vh; }
      .guide.shifted { right: 0; }
    }
    /* Wide screens: the page is given a right-hand column (see pageStyle), and the guide and the
       dock sit in it instead of over the page's content. */
    @media (min-width: 1200px) {
      .guiding .dock { right: 0; bottom: 0; width: 392px; padding: 16px; flex-direction: row; justify-content: flex-end; }
      .guiding .dock .dock-menu { display: flex; flex-direction: row; flex-wrap: wrap; justify-content: flex-end; }
      .guiding .dock .launcher { display: none; }
      .guiding .guide { bottom: 64px; }
    }
  `;

  // Page-level style for the highlighted button (it lives outside the shadow root).
  const pageStyle = document.createElement("style");
  pageStyle.textContent = `
    [data-solid-demo-target] { outline: 3px solid #f59e0b !important; outline-offset: 3px !important;
      animation: solid-demo-pulse 1.6s ease-in-out infinite; }
    @keyframes solid-demo-pulse { 50% { outline-color: rgb(245 158 11 / .35); } }
    @media (prefers-reduced-motion: reduce) { [data-solid-demo-target] { animation: none; } }
    html[data-solid-demo-dock] body { padding-bottom: 56px !important; }
    @media (min-width: 1200px) {
      html[data-solid-demo-guiding] body { padding-right: 392px !important; }
    }
    @media (max-width: 1199px) {
      html[data-solid-demo-guiding] body { padding-top: var(--solid-demo-guide-h, 0px) !important; }
    }
  `;

  let config = { steps: [], apps: [], persona: { name: "the demo persona" } };
  let events = [];
  let filter = read("filter", "all");
  let sidebarOpen = standalone || read("sidebar", false);
  let unseen = 0;
  let guided = read("guided", { active: false, index: 0 });
  let refreshTimer;
  /** The current step's refresh, re-run when the page changes (see watchPage). */
  let currentRefresh;

  const host = el("div", { id: "solid-demo-overlay" });
  const root = host.attachShadow({ mode: "open" });
  root.append(el("style", {}, css));
  const frame = el("div", { class: standalone ? "standalone" : "" });
  root.append(frame);

  // Small polite live regions: the new guide step's title, and each new activity entry's
  // summary (the activity list itself is not live, so re-rendering it is not re-announced).
  const guideAnnouncer = el("div", { class: "sr-only", role: "status", "aria-live": "polite" });
  const activityAnnouncer = el("div", { class: "sr-only", "aria-live": "polite" });
  frame.append(guideAnnouncer, activityAnnouncer);
  let announcedStep;

  // ── Pod activity sidebar ───────────────────────────────────────────────────────
  const list = el("ol", { class: "events", "aria-label": "Pod activity" });
  const filterBar = el("div", {
    class: "filters row",
    role: "group",
    "aria-label": "Filter activity",
  });
  const badge = el("span", { class: "badge", hidden: true });
  const autoLogin = el("input", {
    type: "checkbox",
    checked: !document.cookie.split("; ").includes("demo-autologin=off"),
    onchange: () => {
      document.cookie = `demo-autologin=${autoLogin.checked ? "on" : "off"}; path=/; SameSite=Lax`;
    },
  });

  function renderFilters() {
    filterBar.replaceChildren(
      ...FILTERS.map(([id, label]) =>
        el(
          "button",
          {
            class: "chip",
            type: "button",
            "aria-pressed": String(filter === id),
            onclick: () => {
              filter = id;
              write("filter", id);
              renderFilters();
              renderEvents();
            },
          },
          label,
        ),
      ),
    );
  }

  const time = (iso) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const safeDecode = (value) => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  };

  const ruleText = (rule) => `${rule.who}: ${rule.modes.join(", ")} on ${rule.scope}`;

  /**
   * One log entry. The business action leads; the request (method, path, status) and the
   * unchanged permission rules sit under "Technical details". `times` > 1 marks a run of
   * identical reads shown as one entry.
   */
  function eventItem(event, fresh, times = 1) {
    const item = el(
      "li",
      { class: `event ${event.kind}${fresh ? " fresh" : ""}`, "data-kind": event.kind },
      el(
        "div",
        {},
        event.summary,
        times > 1 ? el("span", { class: "times" }, ` · ${times} times`) : null,
      ),
      el(
        "div",
        { class: "meta" },
        el("span", {}, time(event.at)),
        event.app && !event.actor.includes(event.app) ? el("span", {}, `in ${event.app}`) : null,
      ),
    );
    const technical = [];
    if (event.access) {
      const { granted, revoked, rules } = event.access;
      const changed = new Set(granted.map((rule) => JSON.stringify(rule)));
      const lines = [
        ...granted.map((rule) => el("li", { class: "granted" }, ruleText(rule))),
        ...revoked.map((rule) => el("li", { class: "revoked" }, ruleText(rule))),
      ];
      if (lines.length > 0) {
        item.append(
          el("ul", { class: "rules", "aria-label": "Permissions added and removed" }, lines),
        );
      }
      const kept = rules
        .filter((rule) => !changed.has(JSON.stringify(rule)))
        .map((rule) => el("li", { class: "kept" }, ruleText(rule)));
      if (kept.length > 0) {
        technical.push(
          el("ul", { class: "rules", "aria-label": "Unchanged access control list rules" }, kept),
        );
      }
    }
    if (event.path) {
      technical.unshift(
        el(
          "div",
          { class: "meta" },
          el("span", { class: "kind" }, KIND_LABEL[event.kind] ?? event.kind),
          el("code", {}, `${event.method ?? ""} ${safeDecode(event.path)}`),
          event.status ? el("span", {}, String(event.status)) : null,
          el("span", {}, event.actor),
        ),
      );
    }
    if (technical.length > 0) {
      item.append(
        el("details", { class: "tech" }, el("summary", {}, "Technical details"), technical),
      );
    }
    return item;
  }

  const matches = (event) =>
    filter === "all" || event.kind === filter || (filter === "write" && event.kind === "delete");

  /** Consecutive identical reads (an app refreshing a page) collapse into one entry. */
  const sameRead = (a, b) =>
    a !== undefined &&
    b !== undefined &&
    a.kind === "read" &&
    b.kind === "read" &&
    a.summary === b.summary &&
    a.actor === b.actor;

  /** Shown entries, newest first: [latest event of the run, run length]. */
  function groupEvents(shown) {
    const groups = [];
    for (const event of shown) {
      const last = groups[groups.length - 1];
      if (last && sameRead(last[0], event)) {
        last[0] = event;
        last[1] += 1;
      } else {
        groups.push([event, 1]);
      }
    }
    return groups.reverse();
  }

  let topGroup;
  function renderEvents() {
    const groups = groupEvents(events.filter(matches));
    topGroup = groups[0] ? { event: groups[0][0], times: groups[0][1] } : undefined;
    if (groups.length === 0) {
      list.replaceChildren(
        el(
          "li",
          { class: "empty" },
          "Nothing yet. Reads and changes appear here as you use the apps.",
        ),
      );
      return;
    }
    list.replaceChildren(
      ...groups.slice(0, 400).map(([event, times]) => eventItem(event, false, times)),
    );
  }

  function addEvent(event) {
    events.push(event);
    if (!sidebarOpen && !standalone) {
      unseen += 1;
      badge.textContent = String(unseen);
      badge.hidden = false;
    }
    if (!matches(event)) return;
    if (sidebarOpen || standalone) activityAnnouncer.textContent = event.summary;
    list.querySelector(".empty")?.remove();
    if (topGroup && sameRead(topGroup.event, event) && list.firstElementChild) {
      topGroup = { event, times: topGroup.times + 1 };
      list.firstElementChild.replaceWith(eventItem(event, true, topGroup.times));
      return;
    }
    topGroup = { event, times: 1 };
    list.prepend(eventItem(event, true));
  }

  const sidebar = el(
    "aside",
    { class: `sidebar${sidebarOpen ? " open" : ""}`, "aria-label": "Pod activity log" },
    el(
      "header",
      { class: "side" },
      el(
        "div",
        { class: "row spread" },
        el("h2", {}, "Pod activity"),
        el(
          "div",
          { class: "row" },
          standalone
            ? null
            : el(
                "button",
                {
                  class: "btn",
                  type: "button",
                  title: "Open the log in its own window",
                  onclick: () => {
                    window.open("/__demo/activity", "solid-pod-activity", "width=460,height=860");
                    setSidebar(false);
                  },
                },
                "Pop out",
              ),
          standalone
            ? null
            : el(
                "button",
                {
                  class: "btn",
                  type: "button",
                  onclick: () => setSidebar(false),
                  "aria-label": "Close pod activity",
                },
                "Close",
              ),
        ),
      ),
      el(
        "p",
        {},
        "Who read or changed Alex's pod, newest first. Permission changes show who was added (+) or removed (−).",
      ),
    ),
    filterBar,
    list,
    el(
      "footer",
      { class: "side" },
      el("label", {}, autoLogin, "Sign in automatically with the demo account"),
      el(
        "p",
        { style: "margin:6px 0 0" },
        "Turn this off to see the apps refuse anonymous requests. Local demo: permission changes are saved, but the pod answers every request as Alex. It does not enforce each organisation's access.",
      ),
      el(
        "div",
        { class: "row", style: "margin-top:8px" },
        el(
          "button",
          {
            class: "btn",
            type: "button",
            onclick: async () => {
              if (!confirm("Reset the demo? Alex's pod goes back to its starting state.")) return;
              await fetch("/__demo/reset", { method: "POST" });
              write("guided", { active: guided.active, index: 0 });
              location.reload();
            },
          },
          "Reset demo data",
        ),
      ),
    ),
  );

  const toggle = el(
    "button",
    {
      class: "pill",
      type: "button",
      "aria-expanded": String(sidebarOpen),
      onclick: () => setSidebar(!sidebarOpen),
    },
    "Pod activity",
    badge,
  );

  // ── Guided steps ───────────────────────────────────────────────────────────────
  const guide = el("section", { class: "guide", "aria-label": "Guided demo", hidden: true });
  const tourButton = el(
    "button",
    { class: "pill light", type: "button", onclick: () => startGuided(0) },
    "Start guided tour",
  );

  function setSidebar(open) {
    sidebarOpen = open;
    write("sidebar", open);
    sidebar.classList.toggle("open", open);
    guide.classList.toggle("shifted", open);
    toggle.setAttribute("aria-expanded", String(open));
    if (open) {
      unseen = 0;
      badge.hidden = true;
    }
  }

  const normalise = (path) => path.replace(/\/+$/, "") || "/";
  /** The app (and so the origin) a gateway path belongs to: the longest matching prefix. */
  const appFor = (path) =>
    [...config.apps]
      .sort((a, b) => b.prefix.length - a.prefix.length)
      .find((app) => app.prefix === "" || path === app.prefix || path.startsWith(`${app.prefix}/`));
  const originFor = (path) => appFor(path)?.origin ?? location.origin;
  const samePage = (path) =>
    originFor(path) === location.origin && normalise(location.pathname) === normalise(path);
  /** Open a step's page, on its own app's origin, carrying the tour state along. */
  const openStep = (index) => {
    const step = config.steps[index];
    const target = new URL(step.path, originFor(step.path));
    target.searchParams.set("demo-step", String(index));
    target.searchParams.set("demo-panel", sidebarOpen ? "1" : "0");
    location.assign(target.href);
  };

  function findButton(step) {
    if (!step.action) return undefined;
    if (step.action.selector) {
      const bySelector = document.querySelector(step.action.selector);
      if (bySelector) return bySelector;
    }
    const wanted = step.action.label.trim().toLowerCase();
    return [...document.querySelectorAll("button, a, [role=button]")].find(
      (node) => node.textContent?.trim().toLowerCase() === wanted,
    );
  }

  const noticeButton = () =>
    [...document.querySelectorAll("button")].find((node) =>
      node.textContent?.includes("I understand — enter the demo"),
    );

  function isDone(step) {
    if (step.doneSelector && document.querySelector(step.doneSelector)) return true;
    if (step.doneText && document.body.innerText.includes(step.doneText)) return true;
    return false;
  }

  function go(index) {
    const steps = config.steps;
    if (steps.length === 0) return;
    const next = Math.max(0, Math.min(index, steps.length - 1));
    guided = { active: true, index: next };
    write("guided", guided);
    const step = steps[next];
    if (!samePage(step.path)) openStep(next);
    else renderGuide();
  }

  function startGuided(index) {
    tourButton.hidden = true;
    go(index);
  }

  function clearTargets(except) {
    for (const node of document.querySelectorAll("[data-solid-demo-target]")) {
      if (node !== except) node.removeAttribute("data-solid-demo-target");
    }
  }
  /** Highlight one page control; a no-op when it is already highlighted. */
  function setTarget(node) {
    clearTargets(node);
    if (!node.hasAttribute("data-solid-demo-target"))
      node.setAttribute("data-solid-demo-target", "");
  }

  /** Link on a guide card: gateway paths open on their app's origin; URLs in a new tab. */
  function guideLink(link) {
    const external = /^https?:/.test(link.href);
    return el(
      "a",
      {
        class: link.primary ? "btn primary" : "btn",
        href: external ? link.href : new URL(link.href, originFor(link.href)).href,
        target: external ? "_blank" : undefined,
        rel: external ? "noopener noreferrer" : undefined,
        "data-guide-link": "",
      },
      link.label,
    );
  }

  /**
   * While an app's concept-demo notice (the consent interstitial) is open, the whole overlay
   * is hidden and inert, so it never sits above the notice or takes focus from it.
   */
  function syncInterstitial() {
    const open = document.querySelector("[data-consent-interstitial]") !== null;
    if (host.inert !== open) host.inert = open;
    const display = open ? "none" : "";
    if (host.style.display !== display) host.style.display = display;
  }

  /**
   * Re-check the step whenever the page changes (React rendering a result, a list loading),
   * throttled, so the guide never reports "waiting" beside content that has already loaded.
   */
  let watchTimer = 0;
  function watchPage() {
    const onChange = () => {
      if (watchTimer) return;
      watchTimer = setTimeout(() => {
        watchTimer = 0;
        syncInterstitial();
        currentRefresh?.();
      }, 60);
    };
    new MutationObserver(onChange).observe(document.body ?? document.documentElement, {
      attributes: true,
      attributeFilter: [
        "aria-disabled",
        "disabled",
        "hidden",
        "data-credential-status",
        "data-grant-state",
        "data-panel-outcome",
        "data-pipeline-stage",
      ],
      characterData: true,
      childList: true,
      subtree: true,
    });
    syncInterstitial();
  }

  /** Keep the page's top padding equal to the guide's height (narrow screens, see pageStyle). */
  if (typeof ResizeObserver === "function") {
    new ResizeObserver(() => {
      document.documentElement.style.setProperty(
        "--solid-demo-guide-h",
        guide.hidden ? "0px" : `${guide.offsetHeight}px`,
      );
    }).observe(guide);
  }

  /** Show or hide the guide, and reserve the page's right-hand column while it shows. */
  function setGuideVisible(visible) {
    guide.hidden = !visible;
    tourButton.hidden = visible;
    frame.classList.toggle("guiding", visible);
    document.documentElement.toggleAttribute("data-solid-demo-guiding", visible);
  }

  function stopGuided() {
    guided = { active: false, index: guided.index };
    write("guided", guided);
    clearTargets();
    clearInterval(refreshTimer);
    currentRefresh = undefined;
    announcedStep = undefined;
    setGuideVisible(false);
  }

  /** The visible name of a page button, for the action line (falls back to the step's). */
  const buttonName = (button, fallback) => {
    const text = button?.textContent?.trim().replace(/\s+/g, " ");
    return text && text.length <= 60 ? text : fallback;
  };

  function renderGuide() {
    clearInterval(refreshTimer);
    clearTargets();
    if (!guided.active || config.steps.length === 0) {
      setGuideVisible(false);
      return;
    }
    const steps = config.steps;
    const index = Math.min(guided.index, steps.length - 1);
    const step = steps[index];
    // Keep keyboard focus on the same control when the card is rebuilt.
    const focusedRole = root.activeElement?.getAttribute?.("data-guide-role") ?? undefined;
    setGuideVisible(true);
    const last = index === steps.length - 1;
    const status = el("div", { class: "todo", "data-guide-status": "", "aria-live": "polite" });
    let statusKey = "";
    /** Replace the action line only when it changes, so screen readers hear it once. */
    const setStatus = (key, ...nodes) => {
      if (key === statusKey) return;
      statusKey = key;
      status.setAttribute("data-state", key.split(":")[0]);
      if (key.startsWith("done")) status.setAttribute("data-done", "");
      else status.removeAttribute("data-done");
      status.replaceChildren(...nodes);
    };
    const doIt = el(
      "button",
      { class: "btn", type: "button", "data-guide-do": "", "data-guide-role": "do" },
      "Do it for me",
    );
    const nextButton = el(
      "button",
      { class: "btn primary", type: "button", "data-guide-next": "", "data-guide-role": "next" },
      last ? "Finish" : "Next",
    );
    const advance = () => (last ? stopGuided() : go(index + 1));
    nextButton.onclick = advance;
    const setNextLabel = (label) => {
      if (nextButton.textContent !== label) nextButton.textContent = label;
    };
    let pressed = false;

    function refresh() {
      if (!samePage(step.path)) {
        setStatus(
          "elsewhere",
          "This step is on another page. Press ",
          el("strong", {}, "Next"),
          ".",
        );
        nextButton.onclick = () => openStep(index);
        setNextLabel("Next");
        doIt.hidden = true;
        return;
      }
      nextButton.onclick = advance;
      const finalLabel = last ? "Finish" : "Next";
      const notice = noticeButton();
      if (notice) {
        setTarget(notice);
        setStatus(
          "notice",
          "Read this app's concept-demo notice, then press ",
          el("strong", {}, "I understand — enter the demo"),
          ".",
        );
        setNextLabel(step.action ? "Skip step" : finalLabel);
        doIt.hidden = true;
        return;
      }
      if (step.action && isDone(step)) {
        clearTargets();
        setStatus(
          "done",
          el("span", { class: "done" }, "✓ Done. "),
          last ? "" : "Press Next to continue.",
        );
        setNextLabel(finalLabel);
        doIt.hidden = true;
        return;
      }
      if (step.action) {
        setNextLabel("Skip step");
        const button = findButton(step);
        if (!button) {
          clearTargets();
          setStatus("loading", "Waiting for the page to load…");
          doIt.hidden = true;
          return;
        }
        setTarget(button);
        const busy = button.disabled === true || button.getAttribute("aria-disabled") === "true";
        const name = pressed || busy ? step.action.label : buttonName(button, step.action.label);
        setStatus(
          `${pressed || busy ? "busy" : "press"}:${name}`,
          ...(pressed || busy
            ? ["Working…"]
            : ["Press ", el("strong", {}, name), " (highlighted), or Do it for me."]),
        );
        doIt.hidden = false;
        doIt.disabled = busy || pressed;
        doIt.onclick = () => {
          pressed = true;
          button.scrollIntoView({ block: "center", behavior: "smooth" });
          button.click();
          refresh();
        };
        return;
      }
      clearTargets();
      setNextLabel(finalLabel);
      if (step.doneSelector && !isDone(step)) {
        setStatus(
          "loading",
          step.doneMessage
            ? "Not found yet. The page may still be loading."
            : "Waiting for the page to load…",
        );
      } else if (step.doneMessage) {
        setStatus(
          "found",
          el("span", { class: "done" }, "✓ "),
          `${step.doneMessage} Press `,
          el("strong", {}, finalLabel),
          ".",
        );
      } else {
        setStatus("look", "Have a look, then press ", el("strong", {}, finalLabel), ".");
      }
      doIt.hidden = true;
    }

    // Details (what to watch in Pod activity) start collapsed to keep the card small.
    const open = read("guide-details", false);
    const details = el(
      "div",
      { hidden: !open, id: "solid-demo-guide-details" },
      step.watch ? el("div", { class: "watch" }, step.watch) : "",
      el(
        "button",
        {
          class: "link",
          type: "button",
          onclick: () => setSidebar(true),
        },
        "Open Pod activity",
      ),
    );
    const toggleDetails = el(
      "button",
      {
        class: "link",
        type: "button",
        "aria-expanded": String(open),
        "aria-controls": "solid-demo-guide-details",
        "data-guide-role": "details",
        onclick: () => {
          const show = details.hidden;
          details.hidden = !show;
          toggleDetails.setAttribute("aria-expanded", String(show));
          toggleDetails.textContent = show ? "Hide details" : "Details";
          write("guide-details", show);
        },
      },
      open ? "Hide details" : "Details",
    );
    const back = el(
      "button",
      {
        class: "btn",
        type: "button",
        disabled: index === 0,
        "data-guide-role": "back",
        onclick: () => go(index - 1),
      },
      "Back",
    );
    guide.replaceChildren(
      el(
        "div",
        { class: "row spread" },
        el("span", { class: "count" }, `Step ${index + 1} of ${steps.length}`),
        toggleDetails,
      ),
      el("div", { class: "scene" }, step.scene),
      el("h3", {}, step.title),
      el("p", {}, step.body),
      step.links?.length ? el("div", { class: "row links" }, step.links.map(guideLink)) : "",
      status,
      details,
      el(
        "div",
        { class: "progress", "aria-hidden": "true" },
        el("span", { style: `width:${((index + 1) / steps.length) * 100}%` }),
      ),
      el(
        "div",
        { class: "row spread" },
        el(
          "div",
          { class: "row" },
          back,
          el(
            "button",
            { class: "btn", type: "button", "data-guide-role": "exit", onclick: stopGuided },
            "Exit tour",
          ),
        ),
        el("div", { class: "row" }, doIt, nextButton),
      ),
    );
    guide.setAttribute("data-guide-step", step.id);
    if (announcedStep !== step.id) {
      announcedStep = step.id;
      guideAnnouncer.textContent = `Step ${index + 1} of ${steps.length}: ${step.title}`;
    }
    currentRefresh = refresh;
    refresh();
    if (focusedRole) {
      const target = guide.querySelector(`[data-guide-role="${focusedRole}"]`);
      (target && !target.disabled && !target.hidden ? target : nextButton).focus();
    }
    refreshTimer = setInterval(refresh, 600);
  }

  // ── Boot ──────────────────────────────────────────────────────────────────────
  async function boot() {
    document.head.append(pageStyle);
    (document.body ?? document.documentElement).append(host);
    try {
      config = await fetch("/__demo/config.json", { cache: "no-store" }).then((response) =>
        response.json(),
      );
    } catch {
      // config unavailable: the sidebar still works
    }
    renderFilters();
    try {
      events = await fetch("/__demo/activity.json", { cache: "no-store" }).then((response) =>
        response.json(),
      );
    } catch {
      events = [];
    }
    renderEvents();
    if (standalone) {
      frame.append(sidebar);
    } else {
      const overview =
        config.overview && config.overview !== location.origin
          ? el(
              "a",
              {
                class: "pill light",
                href: `${config.overview}/`,
                title: "Leave this app and go back to the demo overview",
              },
              "← Overview",
            )
          : null;
      const menu = el(
        "div",
        { class: "dock-menu", id: "solid-demo-dock-menu" },
        overview,
        toggle,
        tourButton,
      );
      const dock = el("div", { class: "dock" }, menu);
      const setDockOpen = (open) => {
        dock.classList.toggle("collapsed", !open);
        launcher.setAttribute("aria-expanded", String(open));
        write("dock-open", open);
      };
      const launcher = el(
        "button",
        {
          class: "pill launcher",
          type: "button",
          "aria-controls": "solid-demo-dock-menu",
          onclick: () => setDockOpen(dock.classList.contains("collapsed")),
        },
        "Demo",
      );
      dock.append(launcher);
      setDockOpen(read("dock-open", false));
      frame.append(dock, sidebar, guide);
      document.documentElement.setAttribute("data-solid-demo-dock", "");
      setSidebar(sidebarOpen);
      watchPage();
      renderGuide();
    }
    const source = new EventSource("/__demo/events");
    source.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data);
        if (events.some((known) => known.id === event.id)) return;
        addEvent(event);
      } catch {
        // ignore malformed frames
      }
    };
    source.addEventListener("cleared", () => {
      events = [];
      renderEvents();
    });
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
