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
    access: "Access change",
    auth: "Sign-in",
    info: "Setup",
  };
  const FILTERS = [
    ["all", "All"],
    ["read", "Reads"],
    ["write", "Writes"],
    ["access", "Access"],
    ["auth", "Sign-ins"],
  ];

  const css = `
    :host { all: initial; }
    * { box-sizing: border-box; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
    [hidden] { display: none !important; }
    button { font: inherit; cursor: pointer; }
    .dock { position: fixed; left: 16px; bottom: 72px; z-index: 2147483000; display: flex; gap: 8px; flex-wrap: wrap; }
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

    .guide { position: fixed; right: 16px; bottom: 128px; z-index: 2147483000; width: min(380px, calc(100vw - 32px)); background: #0f172a;
      color: #f8fafc; border-radius: 14px; padding: 14px 16px; box-shadow: 0 12px 32px rgb(15 23 42 / .35); font-size: 14px; line-height: 1.45;
      max-height: calc(100vh - 160px); overflow-y: auto; }
    .guide.shifted { right: min(436px, calc(100vw - 396px)); }
    .guide .scene { font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: #fbbf24; font-weight: 700; }
    .guide h3 { margin: 4px 0 6px; font-size: 16px; }
    .guide p { margin: 0 0 8px; color: #e2e8f0; }
    .guide .todo { background: #1e293b; border-radius: 8px; padding: 8px 10px; margin: 8px 0; font-size: 13px; }
    .guide .todo strong { color: #fbbf24; }
    .guide .done { color: #86efac; font-weight: 700; }
    .guide .watch { font-size: 12px; color: #cbd5e1; border-left: 3px solid #f59e0b; padding-left: 8px; margin: 6px 0 10px; }
    .guide .progress { height: 4px; background: #334155; border-radius: 4px; margin: 10px 0; overflow: hidden; }
    .guide .progress span { display: block; height: 100%; background: #f59e0b; }
    .guide .btn { background: #1e293b; color: #f8fafc; border-color: #475569; }
    .guide .btn.primary { background: #f59e0b; color: #0f172a; border-color: #f59e0b; }
    .guide .count { font-size: 12px; color: #cbd5e1; }
    .guide .link { background: none; border: 0; color: #fbbf24; text-decoration: underline; font-size: 12px; padding: 0 0 0 6px; }
    @media (max-width: 900px) { .guide.shifted { right: 16px; } }
  `;

  // Page-level style for the highlighted button (it lives outside the shadow root).
  const pageStyle = document.createElement("style");
  pageStyle.textContent = `
    [data-solid-demo-target] { outline: 3px solid #f59e0b !important; outline-offset: 3px !important;
      animation: solid-demo-pulse 1.6s ease-in-out infinite; }
    @keyframes solid-demo-pulse { 50% { outline-color: rgb(245 158 11 / .35); } }
    @media (prefers-reduced-motion: reduce) { [data-solid-demo-target] { animation: none; } }
  `;

  let config = { steps: [], apps: [], persona: { name: "the demo persona" } };
  let events = [];
  let filter = read("filter", "all");
  let sidebarOpen = standalone || read("sidebar", false);
  let unseen = 0;
  let guided = read("guided", { active: false, index: 0 });
  let refreshTimer;

  const host = el("div", { id: "solid-demo-overlay" });
  const root = host.attachShadow({ mode: "open" });
  root.append(el("style", {}, css));
  const frame = el("div", { class: standalone ? "standalone" : "" });
  root.append(frame);

  // ── Pod activity sidebar ───────────────────────────────────────────────────────
  const list = el("ol", { class: "events", "aria-live": "polite", "aria-label": "Pod activity" });
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

  function eventItem(event, fresh) {
    const item = el(
      "li",
      { class: `event ${event.kind}${fresh ? " fresh" : ""}`, "data-kind": event.kind },
      el("div", {}, event.summary),
      el(
        "div",
        { class: "meta" },
        el("span", { class: "kind" }, KIND_LABEL[event.kind] ?? event.kind),
        el("span", {}, time(event.at)),
        el(
          "span",
          {},
          event.app && !event.actor.includes(event.app)
            ? `${event.actor} · ${event.app}`
            : event.actor,
        ),
      ),
    );
    if (event.path) {
      item.append(
        el(
          "div",
          { class: "meta" },
          el("code", {}, `${event.method ?? ""} ${safeDecode(event.path)}`),
          event.status ? el("span", {}, String(event.status)) : null,
        ),
      );
    }
    if (event.access) {
      const { granted, revoked, rules } = event.access;
      const changed = new Set(granted.map((rule) => JSON.stringify(rule)));
      const lines = [
        ...granted.map((rule) => el("li", { class: "granted" }, ruleText(rule))),
        ...revoked.map((rule) => el("li", { class: "revoked" }, ruleText(rule))),
        ...rules
          .filter((rule) => !changed.has(JSON.stringify(rule)))
          .map((rule) => el("li", { class: "kept" }, ruleText(rule))),
      ];
      if (lines.length > 0) {
        item.append(
          el(
            "ul",
            { class: "rules", "aria-label": "Access rules: added, removed, unchanged" },
            lines,
          ),
        );
      }
    }
    return item;
  }

  const matches = (event) =>
    filter === "all" || event.kind === filter || (filter === "write" && event.kind === "delete");

  function renderEvents() {
    const shown = events.filter(matches).slice().reverse();
    if (shown.length === 0) {
      list.replaceChildren(
        el(
          "li",
          { class: "empty" },
          "Nothing yet. Use any app and its pod reads and writes appear here.",
        ),
      );
      return;
    }
    list.replaceChildren(...shown.slice(0, 400).map((event) => eventItem(event, false)));
  }

  function addEvent(event) {
    events.push(event);
    if (!sidebarOpen && !standalone) {
      unseen += 1;
      badge.textContent = String(unseen);
      badge.hidden = false;
    }
    if (!matches(event)) return;
    list.querySelector(".empty")?.remove();
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
        el("h2", {}, "What's happening in the pod"),
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
        "Every request that reaches Alex's Solid pod, newest first, with who made it. Access changes list the rules added (+), removed (−) and unchanged.",
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
        "Turn this off to see the apps refuse anonymous requests. This local pod runs in development mode: access rules are written and shown here, but every request is answered as the pod owner.",
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

  function stopGuided() {
    guided = { active: false, index: guided.index };
    write("guided", guided);
    clearTargets();
    clearInterval(refreshTimer);
    guide.hidden = true;
    tourButton.hidden = false;
  }

  function renderGuide() {
    clearInterval(refreshTimer);
    clearTargets();
    if (!guided.active || config.steps.length === 0) {
      guide.hidden = true;
      tourButton.hidden = false;
      return;
    }
    const steps = config.steps;
    const index = Math.min(guided.index, steps.length - 1);
    const step = steps[index];
    guide.hidden = false;
    tourButton.hidden = true;
    const last = index === steps.length - 1;
    const status = el("div", { class: "todo", "data-guide-status": "" });
    const doIt = el(
      "button",
      { class: "btn", type: "button", "data-guide-do": "" },
      "Do it for me",
    );
    const nextButton = el(
      "button",
      { class: "btn primary", type: "button", "data-guide-next": "" },
      last ? "Finish" : "Next",
    );
    const advance = () => (last ? stopGuided() : go(index + 1));
    nextButton.onclick = advance;
    let pressed = false;

    function refresh() {
      if (!samePage(step.path)) {
        status.replaceChildren(
          "This step is on another page. ",
          el("strong", {}, "Press Next"),
          " to go there.",
        );
        nextButton.onclick = () => openStep(index);
        doIt.hidden = true;
        return;
      }
      nextButton.onclick = advance;
      const notice = noticeButton();
      if (notice) {
        clearTargets(notice);
        notice.setAttribute("data-solid-demo-target", "");
        status.replaceChildren(
          "First read the concept-demo notice for this app, then press ",
          el("strong", {}, "I understand — enter the demo"),
          ".",
        );
        doIt.hidden = true;
        return;
      }
      if (step.action && isDone(step)) {
        clearTargets();
        status.setAttribute("data-done", "");
        status.replaceChildren(
          el("span", { class: "done" }, "✓ Done. "),
          last ? "" : "Press Next to continue.",
        );
        doIt.hidden = true;
        return;
      }
      if (step.action) {
        const button = findButton(step);
        if (!button) {
          clearTargets();
          status.replaceChildren("Waiting for the page to load…");
          doIt.hidden = true;
          return;
        }
        clearTargets(button);
        button.setAttribute("data-solid-demo-target", "");
        const busy = button.disabled === true || button.getAttribute("aria-disabled") === "true";
        status.replaceChildren(
          pressed || busy ? "Working… " : "Press ",
          el("strong", {}, step.action.label),
          pressed || busy ? "" : " (highlighted on the page).",
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
      status.replaceChildren(
        "Have a look around this page, then press ",
        el("strong", {}, last ? "Finish" : "Next"),
        ".",
      );
      doIt.hidden = true;
    }

    const collapsed = read("guide-collapsed", false);
    const details = el(
      "div",
      { hidden: collapsed },
      el("p", {}, step.body),
      status,
      step.watch ? el("div", { class: "watch" }, step.watch) : "",
    );
    const collapse = el(
      "button",
      {
        class: "link",
        type: "button",
        "aria-expanded": String(!collapsed),
        onclick: () => {
          const hide = !details.hidden;
          details.hidden = hide;
          collapse.setAttribute("aria-expanded", String(!hide));
          collapse.textContent = hide ? "Show" : "Hide";
          write("guide-collapsed", hide);
        },
      },
      collapsed ? "Show" : "Hide",
    );
    guide.replaceChildren(
      el(
        "div",
        { class: "row spread" },
        el("span", { class: "scene" }, step.scene),
        el("span", { class: "count" }, `Step ${index + 1} of ${steps.length} `, collapse),
      ),
      el("h3", {}, step.title),
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
          el(
            "button",
            { class: "btn", type: "button", disabled: index === 0, onclick: () => go(index - 1) },
            "Back",
          ),
          el("button", { class: "btn", type: "button", onclick: stopGuided }, "Exit tour"),
        ),
        el("div", { class: "row" }, doIt, nextButton),
      ),
    );
    guide.setAttribute("data-guide-step", step.id);
    refresh();
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
      frame.append(el("div", { class: "dock" }, overview, toggle, tourButton), sidebar, guide);
      setSidebar(sidebarOpen);
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
