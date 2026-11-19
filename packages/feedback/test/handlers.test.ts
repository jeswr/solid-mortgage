// AUTHORED-BY Claude Opus 5.5
import { describe, expect, it, vi } from "vitest";
import {
  createFeedbackHandlers,
  createGithubStore,
  createLimiter,
  type FeedbackStore,
  type InterviewClient,
  type ModelRequest,
  signReceipt,
} from "../src/server/index.js";
import { ENV, SUBMISSION } from "./fixtures.js";

const ORIGIN = "https://solid-mortgage.vercel.app";

function post(path: string, body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`${ORIGIN}/api/feedback/${path}`, {
    method: "POST",
    headers: {
      origin: ORIGIN,
      "content-type": "application/json",
      "x-real-ip": "203.0.113.5",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const OPENING = { role: "assistant", content: "Thank you. What is your role?" };

function turnBody(answer: string, answers: Record<string, unknown> = {}) {
  return { pathway: "guided", answers, messages: [OPENING, { role: "user", content: answer }] };
}

function client(reply: unknown): InterviewClient & { requests: ModelRequest[] } {
  const requests: ModelRequest[] = [];
  return {
    requests,
    async complete(request) {
      requests.push(request);
      return typeof reply === "string" ? reply : JSON.stringify(reply);
    },
  };
}

describe("status", () => {
  it("reports two booleans and nothing else", async () => {
    const off = createFeedbackHandlers({ env: {} }).status(
      new Request(`${ORIGIN}/api/feedback/status`),
    );
    expect(off.status).toBe(200);
    expect(off.headers.get("cache-control")).toBe("no-store");
    expect(await off.json()).toEqual({ interviewer: false, sending: false });

    const on = createFeedbackHandlers({ env: ENV }).status(
      new Request(`${ORIGIN}/api/feedback/status`),
    );
    const body = await on.text();
    expect(JSON.parse(body)).toEqual({ interviewer: true, sending: true });
    for (const secret of Object.values(ENV)) expect(body).not.toContain(secret);
    expect(body).not.toContain("example/feedback");
  });

  it("says sending is off for a malformed repository name", async () => {
    const handlers = createFeedbackHandlers({
      env: { ...ENV, FEEDBACK_GITHUB_REPO: "not a repo" },
    });
    expect(await handlers.status(new Request(`${ORIGIN}/api/feedback/status`)).json()).toEqual({
      interviewer: true,
      sending: false,
    });
  });
});

describe("turn", () => {
  it("refuses other origins and non-JSON bodies", async () => {
    const handlers = createFeedbackHandlers({ env: ENV, client: client({}) });
    expect(
      (await handlers.turn(post("turn", turnBody("a"), { origin: "https://evil.example" }))).status,
    ).toBe(403);
    expect((await handlers.turn(post("turn", "a", { "content-type": "text/plain" }))).status).toBe(
      415,
    );
    expect((await handlers.turn(post("turn", "{not json"))).status).toBe(400);
    expect((await handlers.turn(post("turn", { ...turnBody("a"), extra: true }))).status).toBe(400);
  });

  it("fails closed with 503 when the interviewer is not switched on", async () => {
    const response = await createFeedbackHandlers({ env: {} }).turn(post("turn", turnBody("a")));
    expect(response.status).toBe(503);
    expect((await response.json()).error).toContain("isn't switched on");
  });

  it("returns the reply, merged answers and the next question", async () => {
    const interviewer = client({
      reply: "Thanks. Which best describes your organisation?",
      updates: [{ id: "context_role", value: "Data architect" }],
      nextQuestionId: "context_org",
      done: false,
    });
    const handlers = createFeedbackHandlers({ env: ENV, client: interviewer });
    const response = await handlers.turn(
      post("turn", turnBody("I am a data architect", { likelihood: 2 })),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe(ORIGIN);
    const body = await response.json();
    expect(body.answers).toEqual({ likelihood: 2, context_role: "Data architect" });
    expect(body.question.id).toBe("context_org");
    expect(body.done).toBe(false);
    expect(interviewer.requests[0]?.model).toBe("claude-opus-5-5");
  });

  it("uses FEEDBACK_MODEL when set", async () => {
    const interviewer = client({
      reply: "ok",
      updates: [],
      nextQuestionId: "context_org",
      done: false,
    });
    await createFeedbackHandlers({
      env: { ...ENV, FEEDBACK_MODEL: "claude-sonnet-5-5" },
      client: interviewer,
    }).turn(post("turn", turnBody("a")));
    expect(interviewer.requests[0]?.model).toBe("claude-sonnet-5-5");
  });

  it("never lets the model confirm the read-back on the participant's behalf", async () => {
    const reply = {
      reply: "Thanks, all done.",
      updates: [
        { id: "confirmed", value: "yes" },
        { id: "summary", value: "• fine" },
      ],
      nextQuestionId: "none",
      done: true,
    };
    const handlers = createFeedbackHandlers({ env: ENV, client: client(reply) });
    // The participant said something else: no confirmation, and no next question means 502.
    const refused = await handlers.turn(
      post("turn", turnBody("Actually, change that", { summary: "• x" })),
    );
    expect(refused.status).toBe(502);
    // The participant confirmed in words after a read-back: done.
    const confirmed = await handlers.turn(
      post("turn", turnBody("Yes, that's right", { summary: "• x" })),
    );
    const body = await confirmed.json();
    expect(body.done).toBe(true);
    expect(body.answers.confirmed).toBe("yes");
  });

  it("turns an unusable model reply into a plain 502 without upstream text", async () => {
    for (const reply of [
      "not json",
      { reply: "x" },
      { reply: "x", updates: [], nextQuestionId: "made_up", done: false },
    ]) {
      const response = await createFeedbackHandlers({ env: ENV, client: client(reply) }).turn(
        post("turn", turnBody("a")),
      );
      expect(response.status).toBe(502);
      expect(await response.text()).not.toContain("made_up");
    }
    const failing: InterviewClient = {
      complete: () => Promise.reject(new Error("upstream said sk-secret-detail")),
    };
    const response = await createFeedbackHandlers({ env: ENV, client: failing }).turn(
      post("turn", turnBody("a")),
    );
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("sk-secret-detail");
  });

  it("rate limits per visitor with Retry-After", async () => {
    const handlers = createFeedbackHandlers({
      env: ENV,
      client: client({ reply: "ok", updates: [], nextQuestionId: "context_org", done: false }),
      limiter: createLimiter(() => 0, { turn: 1, submit: 1, audio: 1, status: 1 }),
    });
    expect((await handlers.turn(post("turn", turnBody("a")))).status).toBe(200);
    const limited = await handlers.turn(post("turn", turnBody("a")));
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);
  });
});

describe("submit and audio", () => {
  const store = (): FeedbackStore & { saved: unknown[] } => {
    const saved: unknown[] = [];
    return {
      saved,
      upload: async (audio) =>
        signReceipt({ sha: "e".repeat(40), size: audio.bytes.length, ext: audio.ext }, ENV),
      save: async (submission, audio) => {
        saved.push({ submission, audio });
        return { reference: 42 };
      },
    };
  };

  it("fails closed with 503 when sending is not switched on", async () => {
    const handlers = createFeedbackHandlers({ env: { ANTHROPIC_API_KEY: "k" } });
    expect(
      (await handlers.submit(post("submit", { record: SUBMISSION, receipts: [] }))).status,
    ).toBe(503);
    expect(
      (await handlers.audio(post("audio", "x", { "content-type": "audio/webm" }))).status,
    ).toBe(503);
  });

  it("stores a valid record and answers its reference", async () => {
    const s = store();
    const response = await createFeedbackHandlers({ env: ENV, store: s }).submit(
      post("submit", { record: SUBMISSION, receipts: [] }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ reference: 42 });
    expect(s.saved).toHaveLength(1);
  });

  it("refuses an invalid record, a missing recording and a forged receipt", async () => {
    const handlers = createFeedbackHandlers({ env: ENV, store: store() });
    expect(
      (
        await handlers.submit(
          post("submit", { record: { ...SUBMISSION, pathway: "x" }, receipts: [] }),
        )
      ).status,
    ).toBe(400);
    const withAudio = {
      ...SUBMISSION,
      transcript: [{ role: "user", content: "voice", audio: [0] }],
    };
    expect(
      (await handlers.submit(post("submit", { record: withAudio, receipts: [] }))).status,
    ).toBe(400);
    const forged = {
      sha: "f".repeat(40),
      size: 10,
      ext: "webm",
      sig: `${Date.now() + 1000}.${"0".repeat(64)}`,
    };
    expect(
      (await handlers.submit(post("submit", { record: withAudio, receipts: [forged] }))).status,
    ).toBe(400);
  });

  it("refuses an oversized submission with 413", async () => {
    const big = {
      record: { ...SUBMISSION, answers: { comments: "x".repeat(1_100_000) } },
      receipts: [],
    };
    expect(
      (await createFeedbackHandlers({ env: ENV, store: store() }).submit(post("submit", big)))
        .status,
    ).toBe(413);
  });

  it("stores a sniffed recording and answers a receipt that submit accepts", async () => {
    const s = store();
    const handlers = createFeedbackHandlers({ env: ENV, store: s });
    const webm = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 1, 2, 3, 4, 5, 6, 7, 8]);
    const upload = await handlers.audio(
      new Request(`${ORIGIN}/api/feedback/audio`, {
        method: "POST",
        headers: { origin: ORIGIN, "content-type": "audio/webm" },
        body: webm,
      }),
    );
    expect(upload.status).toBe(200);
    const receipt = await upload.json();
    const record = { ...SUBMISSION, transcript: [{ role: "user", content: "voice", audio: [0] }] };
    expect((await handlers.submit(post("submit", { record, receipts: [receipt] }))).status).toBe(
      200,
    );
    const html = await handlers.audio(
      post("audio", "<html>not audio</html>", { "content-type": "audio/webm" }),
    );
    expect(html.status).toBe(400);
  });
});

describe("the GitHub store", () => {
  type Call = { url: string; method: string; body?: Record<string, unknown> };

  function github(
    overrides: { private?: boolean; patchFailures?: number; labels422?: boolean } = {},
  ) {
    const calls: Call[] = [];
    let patchFailures = overrides.patchFailures ?? 0;
    let issueAttempts = 0;
    const respond = (status: number, body: unknown) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      });
    const transport = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      const body = init?.body
        ? (JSON.parse(String(init.body)) as Record<string, unknown>)
        : undefined;
      calls.push({ url, method, ...(body ? { body } : {}) });
      expect((init?.headers as Record<string, string> | undefined)?.Authorization).toBe(
        "Bearer github_pat_test",
      );
      expect(init?.redirect).toBe("error");
      const path = url.replace("https://api.github.com/repos/example/feedback", "");
      if (path === "" && method === "GET") {
        return respond(200, { private: overrides.private ?? true, default_branch: "main" });
      }
      if (path === "/git/blobs") return respond(201, { sha: "1".repeat(40) });
      if (path === "/git/ref/heads/main") return respond(200, { object: { sha: "2".repeat(40) } });
      if (path.startsWith("/git/commits/")) return respond(200, { tree: { sha: "3".repeat(40) } });
      if (path === "/git/trees") return respond(201, { sha: "4".repeat(40) });
      if (path === "/git/commits") return respond(201, { sha: "5".repeat(40) });
      if (path === "/git/refs/heads/main") {
        if (patchFailures-- > 0) return respond(422, { message: "Update is not a fast forward" });
        return respond(200, {});
      }
      if (path === "/issues") {
        issueAttempts++;
        if (overrides.labels422 && issueAttempts === 1) return respond(422, { message: "label" });
        return respond(201, { number: 7 });
      }
      return respond(404, {});
    });
    return { calls, transport };
  }

  const make = (gh: ReturnType<typeof github>) =>
    createGithubStore(
      ENV,
      gh.transport as unknown as typeof fetch,
      () => new Date("2026-11-19T10:00:00Z"),
      () => "id-1",
      async () => {},
    );

  it("stores one commit and one issue, and answers the issue number", async () => {
    const gh = github();
    const receipt = signReceipt({ sha: "9".repeat(40), size: 12, ext: "webm" }, ENV);
    expect(
      await make(gh).save(
        { ...SUBMISSION, answers: { ...SUBMISSION.answers, summary: "• Good" } },
        [receipt],
      ),
    ).toEqual({
      reference: 7,
    });
    const tree = gh.calls.find((c) => c.url.endsWith("/git/trees"))?.body?.tree as {
      path: string;
      sha: string;
    }[];
    expect(tree.map((t) => t.path)).toEqual([
      "feedback/2026-11-19/id-1/audio-1.webm",
      "feedback/2026-11-19/id-1/submission.json",
      "feedback/2026-11-19/id-1/summary.md",
    ]);
    expect(tree[0]?.sha).toBe("9".repeat(40));
    const issue = gh.calls.find((c) => c.url.endsWith("/issues"))?.body;
    expect(issue?.title).toBe("guided: • Good");
    expect(issue?.labels).toEqual([
      "feedback",
      "pathway:guided",
      "mode:questionnaire",
      "demo:mortgage",
      "from:lender",
    ]);
    expect(String(issue?.body)).toContain("submission.json");
  });

  it("refuses a public repository", async () => {
    await expect(make(github({ private: false })).save(SUBMISSION, [])).rejects.toMatchObject({
      status: 503,
    });
  });

  it("rebuilds on the new head after losing a race, and files without labels when they are refused", async () => {
    const gh = github({ patchFailures: 2, labels422: true });
    expect(await make(gh).save(SUBMISSION, [])).toEqual({ reference: 7 });
    expect(gh.calls.filter((c) => c.method === "PATCH")).toHaveLength(3);
    expect(gh.calls.filter((c) => c.url.endsWith("/issues")).at(-1)?.body?.labels).toBeUndefined();
  });

  it("is not configured without a token or with a malformed repository", async () => {
    await expect(createGithubStore({}).save(SUBMISSION, [])).rejects.toMatchObject({ status: 503 });
    await expect(
      createGithubStore({ FEEDBACK_GITHUB_TOKEN: "t", FEEDBACK_GITHUB_REPO: "../etc" }).save(
        SUBMISSION,
        [],
      ),
    ).rejects.toMatchObject({ status: 503 });
  });
});

describe("the Vercel function entry points", () => {
  it("export Web-standard method handlers", async () => {
    const status = await import("../../../api/feedback/status.js");
    const turn = await import("../../../api/feedback/turn.js");
    const audio = await import("../../../api/feedback/audio.js");
    const submit = await import("../../../api/feedback/submit.js");
    expect(typeof status.GET).toBe("function");
    for (const mod of [turn, audio, submit]) {
      expect(typeof mod.POST).toBe("function");
      expect(typeof mod.OPTIONS).toBe("function");
    }
    const response = status.GET(new Request(`${ORIGIN}/api/feedback/status`));
    expect(Object.keys(await response.json()).sort()).toEqual(["interviewer", "sending"]);
  });
});
