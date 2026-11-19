// AUTHORED-BY Claude Opus 5.5
/**
 * The feedback page. It asks the API what is switched on (`GET /api/feedback/status`), then:
 *
 * - interviewer on: the visitor picks the guided interview, a quick note or the questionnaire;
 * - interviewer off: the plain questionnaire, straight away.
 *
 * Either way the visitor can download every answer at any time. Sending is offered only when
 * storage is switched on; otherwise the page says so plainly and points to the community forum.
 */

import { appUrl } from "@mortgage/demo-kit/urls";
import {
  type Answer,
  type Answers,
  ARCHIVE_NAME,
  type AudioReceipt,
  COMMUNITY_LINKS,
  type FeedbackStatus,
  feedbackArchive,
  isFeedbackDemo,
  localSummary,
  MAX_RECORDINGS,
  OPENING,
  type Pathway,
  QUICK_OPENING,
  type Question,
  questionById,
  type Submission,
  type TranscriptEntry,
  validateAnswers,
} from "@mortgage/feedback";
import { useEffect, useRef, useState } from "react";
import { FEEDBACK_VERSION } from "../site.ts";
import { fetchStatus, saveArchive, submitFeedback, uploadRecording } from "./api.ts";
import { Interview } from "./Interview.tsx";
import { Questionnaire } from "./Questionnaire.tsx";
import type { VoiceClip } from "./speech.ts";

type Mode = "choose" | "interview" | "questionnaire";

/** The visitor's arrival: `from=<app slug>` from the banner link, `demo=<id>` from a watch page. */
export function readArrival(search: string): { from: string; demos: string[] } {
  const params = new URLSearchParams(search);
  const from = params.get("from") ?? "";
  const demo = params.get("demo") ?? "";
  return {
    from: /^[a-z0-9_-]{1,40}$/.test(from) ? from : "",
    demos: isFeedbackDemo(demo) ? [demo] : [],
  };
}

const hasContent = (answers: Answers) =>
  Object.entries(answers).some(([id, value]) => id !== "summary" && value !== "(skipped)");

export function FeedbackPage({ search = window.location.search }: { search?: string }) {
  const arrival = useRef(readArrival(search)).current;
  const [status, setStatus] = useState<FeedbackStatus | null>(null);
  const [mode, setMode] = useState<Mode>("choose");
  const [pathway, setPathway] = useState<Pathway>("guided");
  const [answers, setAnswersState] = useState<Answers>(
    arrival.demos.length > 0 ? { demos: arrival.demos } : {},
  );
  const [messages, setMessages] = useState<TranscriptEntry[]>([]);
  const [question, setQuestion] = useState<Question | undefined>();
  const [done, setDone] = useState(false);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<number[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [downloaded, setDownloaded] = useState(false);
  const [reference, setReference] = useState<number>();
  const clips = useRef<VoiceClip[]>([]);
  const receipts = useRef<(AudioReceipt | undefined)[]>([]);
  const [clipCount, setClipCount] = useState(0);
  const [savingRecordings, setSavingRecordings] = useState(0);
  const uploading = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    void fetchStatus(controller.signal).then((next) => {
      setStatus(next);
      if (!next.interviewer) setMode("questionnaire");
    });
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  const setAnswers = (next: Answers) => {
    try {
      setAnswersState(validateAnswers(next));
    } catch {
      // Keep the last valid answers rather than store something the server would refuse.
    }
  };

  const changeAnswer = (id: string, value: Answer | undefined) => {
    const next = { ...answers };
    if (value === undefined) delete next[id];
    else next[id] = value;
    setAnswers(next);
  };

  async function upload(clip: VoiceClip, index: number): Promise<AudioReceipt> {
    uploading.current++;
    setSavingRecordings(uploading.current);
    try {
      for (let attempt = 0; ; attempt++) {
        try {
          const receipt = await uploadRecording(clip.blob);
          receipts.current[index] = receipt;
          return receipt;
        } catch (failure) {
          if (attempt === 1) throw failure;
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }
    } finally {
      uploading.current--;
      setSavingRecordings(uploading.current);
    }
  }

  function onClip(clip: VoiceClip): number | undefined {
    if (clips.current.length >= MAX_RECORDINGS || clip.blob.size > 3 * 1024 * 1024) {
      setError(`You can attach up to ${MAX_RECORDINGS} recordings of 3 MB each.`);
      return undefined;
    }
    const index = clips.current.length;
    clips.current = [...clips.current, clip];
    setClipCount(clips.current.length);
    void upload(clip, index).catch(() =>
      setError(
        "We couldn't store that recording yet. It is still on this page: Send tries again, and Download keeps a copy.",
      ),
    );
    return index;
  }

  function start(next: Pathway) {
    const first = questionById(next === "quick" ? "general" : "context_role");
    setPathway(next);
    setQuestion(first);
    setMode("interview");
    setMessages([
      {
        role: "assistant",
        content: `${next === "guided" ? OPENING : QUICK_OPENING}\n\n${first?.text ?? ""}`,
      },
    ]);
  }

  function fallBack(message: string) {
    setNotice(message);
    setMode("questionnaire");
  }

  /** The record exactly as Send would send it (and Download saves). */
  function record(): Submission {
    const draftText = draft.trim();
    const extra: TranscriptEntry[] =
      mode === "interview" && (draftText !== "" || pending.length > 0)
        ? [
            {
              role: "user",
              content: draftText || "(voice answer recorded; no transcript)",
              ...(pending.length > 0 ? { audio: pending } : {}),
            },
          ]
        : [];
    const current: Answers = { ...answers };
    if (mode === "interview" && draftText !== "" && question?.type === "text")
      current[question.id] = draftText;
    if (mode === "questionnaire" && current.summary === undefined && hasContent(current)) {
      current.summary = localSummary(current);
    }
    return {
      pathway: mode === "interview" ? pathway : "guided",
      mode: messages.length > 0 ? "interview" : "questionnaire",
      answers: current,
      transcript: [...messages, ...extra],
      contact: { name: name.trim(), email: email.trim() },
      metadata: {
        version: FEEDBACK_VERSION,
        from: arrival.from,
        userAgent: navigator.userAgent.slice(0, 1000),
      },
    };
  }

  async function send() {
    if (busy || uploading.current > 0) return;
    setError("");
    setBusy(true);
    try {
      const saved: AudioReceipt[] = [];
      for (const [i, clip] of clips.current.entries()) {
        const receipt = receipts.current[i];
        // Re-upload ten minutes early, so a slow device clock never sends an expired receipt.
        const expires = Number(receipt?.sig.split(".")[0] ?? 0);
        saved.push(
          receipt !== undefined && expires - 600_000 > Date.now() ? receipt : await upload(clip, i),
        );
      }
      setReference(await submitFeedback(record(), saved));
    } catch {
      setError(
        "We couldn't send your feedback. Your answers are still here: try again, or use Download my answers to keep a copy.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    setError("");
    try {
      const archiveClips = await Promise.all(
        clips.current.map(async (clip) => ({
          bytes: new Uint8Array(await clip.blob.arrayBuffer()),
          type: clip.blob.type,
        })),
      );
      saveArchive(feedbackArchive(record(), archiveClips), ARCHIVE_NAME);
      setDownloaded(true);
    } catch {
      setError("The download couldn't be made. Please try again before leaving this page.");
    }
  }

  const sending = status?.sending === true;
  const anything = hasContent(answers) || messages.length > 1 || draft.trim() !== "";
  return (
    <div className="feedback">
      <header className="feedback__intro">
        <p className="eyebrow">For EDMA members</p>
        <h1>Give feedback</h1>
        <p className="lede">
          What did you make of the Solid demos? Tell us honestly what convinced you, what did not,
          and what your organisation would need to see. It takes about ten minutes, and you can skip
          anything.
        </p>
      </header>

      <aside className="privacy" aria-label="How your feedback is handled">
        {status === null ? (
          <p>Checking how feedback is handled…</p>
        ) : (
          <>
            {sending ? (
              <p>
                When you press Send, your answers, the conversation and any recordings are stored in
                a private GitHub repository that only the demo team reads. Your name and email are
                optional and stored with them if you give them. Please don't include anything
                confidential.
              </p>
            ) : (
              <p>
                Your answers stay in this page. Nothing is sent anywhere: you download them and
                choose what to share.
              </p>
            )}
            {status.interviewer ? (
              <p>
                The interviewer is an AI model (Anthropic's Claude). Each answer you send it is
                processed to choose the next question. Speaking uses your browser's dictation where
                it has one.
              </p>
            ) : null}
          </>
        )}
      </aside>

      {status !== null && !sending ? (
        <p className="status-note" role="status">
          <strong>Sending feedback is not switched on yet.</strong> You can still answer the
          questions below and download your answers, then share them with the community in the{" "}
          <a href={COMMUNITY_LINKS.forum}>EDMA Solid forum</a>.
        </p>
      ) : null}

      {reference !== undefined ? (
        <div className="done" role="status">
          <h2>Thank you</h2>
          <p>
            Your feedback is with the demo team. Your reference is <strong>#{reference}</strong>.
          </p>
        </div>
      ) : (
        <>
          {status !== null && mode === "choose" ? (
            <section className="choose" aria-labelledby="choose-heading">
              <h2 id="choose-heading">How would you like to give feedback?</h2>
              <div className="button-row">
                <button type="button" className="button" onClick={() => start("guided")}>
                  Start the interview
                </button>
                <button
                  type="button"
                  className="button button--outline"
                  onClick={() => start("quick")}
                >
                  Just tell us
                </button>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() => setMode("questionnaire")}
                >
                  Use the questionnaire
                </button>
              </div>
              <p className="hint">
                The interview takes about ten minutes. A quick note takes as long as you like. The
                questionnaire asks the same questions as a form.
              </p>
            </section>
          ) : null}

          {notice ? (
            <p className="status-note" role="status">
              {notice}
            </p>
          ) : null}

          {mode === "interview" ? (
            <Interview
              pathway={pathway}
              from={arrival.from}
              answers={answers}
              setAnswers={setAnswers}
              messages={messages}
              setMessages={setMessages}
              question={question}
              setQuestion={setQuestion}
              done={done}
              setDone={setDone}
              voiceEnabled={sending}
              clipCount={clipCount}
              onClip={onClip}
              savingRecordings={savingRecordings}
              onFallback={fallBack}
              draft={draft}
              setDraft={setDraft}
              pending={pending}
              setPending={setPending}
            />
          ) : null}

          {mode === "questionnaire" ? (
            <form
              className="questionnaire-form"
              aria-label="Feedback questionnaire"
              onSubmit={(event) => event.preventDefault()}
            >
              <Questionnaire answers={answers} onChange={changeAnswer} disabled={busy} />
            </form>
          ) : null}

          {mode === "choose" ? null : (
            <section className="finish" aria-labelledby="finish-heading">
              <h2 id="finish-heading">{sending ? "Send or keep a copy" : "Keep your answers"}</h2>
              {sending ? (
                <div className="contact">
                  <div>
                    <label htmlFor="feedback-name">Name (optional)</label>
                    <input
                      id="feedback-name"
                      value={name}
                      maxLength={120}
                      autoComplete="name"
                      onChange={(event) => setName(event.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="feedback-email">Email (optional)</label>
                    <input
                      id="feedback-email"
                      type="email"
                      value={email}
                      maxLength={254}
                      autoComplete="email"
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </div>
                  <p className="hint">Leave both blank to stay anonymous.</p>
                </div>
              ) : null}
              {savingRecordings > 0 ? (
                <p role="status" className="hint">
                  Storing your recording…
                </p>
              ) : null}
              {error ? (
                <p role="alert" className="alert">
                  {error}
                </p>
              ) : null}
              <div className="button-row">
                {sending ? (
                  <button
                    type="button"
                    className="button"
                    disabled={busy || savingRecordings > 0 || !anything}
                    onClick={() => void send()}
                  >
                    {busy
                      ? "Sending…"
                      : mode === "interview" && !done
                        ? "Send what I've said so far"
                        : "Send feedback"}
                  </button>
                ) : null}
                <button
                  type="button"
                  className={sending ? "button button--outline" : "button"}
                  disabled={busy || !anything}
                  onClick={() => void download()}
                >
                  Download my answers
                </button>
              </div>
              {!sending && downloaded ? (
                <p className="status-note" role="status">
                  Saved as {ARCHIVE_NAME}. To share it, post it or a summary in the{" "}
                  <a href={COMMUNITY_LINKS.forum}>EDMA Solid forum</a>.
                </p>
              ) : null}
            </section>
          )}
        </>
      )}

      <section className="community" aria-labelledby="community-heading">
        <h2 id="community-heading">Carry on the conversation</h2>
        <p>
          The EDMA Solid Community of Practice meets weekly and talks in the forum between meetings.
        </p>
        <ul className="link-list">
          <li>
            <a href={COMMUNITY_LINKS.forum}>Join the EDMA Solid forum</a>
          </li>
          <li>
            <a href={COMMUNITY_LINKS.meeting}>Register for the weekly meeting</a>
          </li>
          <li>
            <a href={appUrl("welcome")}>Back to the demos</a>
          </li>
        </ul>
      </section>
    </div>
  );
}
