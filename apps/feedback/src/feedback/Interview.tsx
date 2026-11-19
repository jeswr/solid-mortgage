// AUTHORED-BY Claude Opus 5.5
/**
 * The interviewer-led conversation (ported from the Solid Suite's feedback interview). One
 * question at a time; ratings, choices and multi-selects get buttons, everything else is typed
 * or spoken. Each answer goes to /api/feedback/turn; if the interviewer cannot reply the page
 * hands every answer so far to the questionnaire (`onFallback`), so nothing is lost.
 */
import {
  type Answer,
  type Answers,
  MAX_ANSWER,
  MAX_RECORDINGS,
  MAX_TURN_MESSAGES,
  type Pathway,
  type Question,
  STAGES,
  type TranscriptEntry,
} from "@mortgage/feedback";
import { useEffect, useRef, useState } from "react";
import { sendTurn } from "./api.ts";
import { useVoice, type VoiceClip } from "./speech.ts";

export interface InterviewProps {
  pathway: Pathway;
  from: string;
  answers: Answers;
  setAnswers: (answers: Answers) => void;
  messages: TranscriptEntry[];
  setMessages: (messages: TranscriptEntry[]) => void;
  question: Question | undefined;
  setQuestion: (question: Question | undefined) => void;
  done: boolean;
  setDone: (done: boolean) => void;
  /** Voice answers are offered only when recordings can be stored. */
  voiceEnabled: boolean;
  clipCount: number;
  /** A finished recording; answers the index it was stored under, or undefined when refused. */
  onClip: (clip: VoiceClip) => number | undefined;
  savingRecordings: number;
  /** The interviewer failed or ran out of turns: carry on in the questionnaire. */
  onFallback: (message: string) => void;
  /** The answer being typed, kept by the page so Send and Download include it. */
  draft: string;
  setDraft: (draft: string) => void;
  pending: number[];
  setPending: (pending: number[]) => void;
}

export function Interview(props: InterviewProps) {
  const { pathway, answers, messages, question, done, draft, setDraft, pending, setPending } =
    props;
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const voiceBase = useRef("");
  const end = useRef<HTMLDivElement>(null);
  const voice = useVoice(
    (text) => setDraft([voiceBase.current, text].filter(Boolean).join(" ").slice(0, MAX_ANSWER)),
    (clip) => {
      const index = props.onClip(clip);
      if (index !== undefined) setPending([...pending, index]);
    },
  );

  useEffect(() => {
    if (messages.length > 0) end.current?.scrollIntoView?.({ block: "nearest" });
  }, [messages.length]);

  async function send(text = draft.trim(), value?: Answer) {
    if (question === undefined || sending.current || voice.listening || voice.starting) return;
    if (text === "" && pending.length === 0) return;
    const content = text || "(voice answer recorded; no transcript)";
    const next: Answers = { ...answers };
    if (question.id === "confirmed") {
      if (value === "yes") next.confirmed = "yes";
      else delete next.confirmed;
    } else if (value !== undefined) next[question.id] = value;
    else if (question.type === "text") next[question.id] = content;
    const transcript: TranscriptEntry[] = [
      ...messages,
      { role: "user", content, ...(pending.length > 0 ? { audio: pending } : {}) },
    ];
    setDraft("");
    setPending([]);
    props.setAnswers(next);
    props.setMessages(transcript);
    if (transcript.filter((m) => m.role === "user").length >= MAX_TURN_MESSAGES) {
      props.onFallback(
        "That's a long conversation, so the rest is a plain questionnaire. Your answers are kept.",
      );
      return;
    }
    sending.current = true;
    setBusy(true);
    try {
      const bounded =
        transcript.length > MAX_TURN_MESSAGES
          ? [...transcript.slice(0, 1), ...transcript.slice(-(MAX_TURN_MESSAGES - 1))]
          : transcript;
      const result = await sendTurn({
        pathway,
        from: props.from,
        answers: next,
        messages: bounded.map((m) => ({ role: m.role, content: m.content })),
      });
      props.setAnswers(result.answers);
      props.setQuestion(result.question);
      props.setDone(result.done);
      props.setMessages([...transcript, { role: "assistant", content: result.reply }]);
    } catch {
      props.onFallback(
        "The interviewer couldn't reply. Your answers so far are kept: carry on in the questionnaire below, then send or download it.",
      );
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  const locked = busy || voice.listening || voice.starting;
  const stageLabel = pathway === "quick" ? "Quick note" : (STAGES[question?.stage ?? 7] ?? "");
  return (
    <section className="interview" aria-label="Feedback interview">
      <div className="interview__progress">
        <label htmlFor="feedback-progress">{done ? "Ready to send" : stageLabel}</label>
        <progress
          id="feedback-progress"
          value={done ? STAGES.length : (question?.stage ?? 0)}
          max={STAGES.length}
        />
      </div>
      {/* Focusable so keyboard users can scroll a long conversation (axe scrollable-region-focusable). */}
      <div
        className="transcript"
        role="log"
        aria-label="Feedback conversation"
        aria-live="polite"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must take focus.
        tabIndex={0}
      >
        {messages.map((m, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: the transcript is append-only.
            key={`${i}-${m.role}`}
            className={m.role === "user" ? "bubble bubble--you" : "bubble"}
          >
            <p className="bubble__who">{m.role === "user" ? "You" : "Interviewer"}</p>
            <p className="bubble__text">{m.content}</p>
            {m.audio?.map((index) => (
              <p key={index} className="bubble__audio">
                Recording {index + 1} attached
              </p>
            ))}
          </div>
        ))}
        {busy ? (
          <p className="bubble bubble--waiting" role="status">
            The interviewer is thinking…
          </p>
        ) : null}
        <div ref={end} />
      </div>
      {done || question === undefined ? null : (
        <div className="answer">
          <Controls
            key={question.id}
            question={question}
            disabled={locked}
            onAnswer={(t, v) => void send(t, v)}
          />
          <label htmlFor="feedback-answer">Your answer</label>
          <textarea
            id="feedback-answer"
            rows={4}
            maxLength={MAX_ANSWER}
            value={draft}
            disabled={locked}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={props.voiceEnabled ? "Type here, or speak" : "Type here"}
          />
          <div className="button-row">
            <button
              type="button"
              className="button"
              disabled={locked || (draft.trim() === "" && pending.length === 0)}
              onClick={() => void send()}
            >
              Send answer
            </button>
            {props.voiceEnabled ? (
              <button
                type="button"
                className="button button--outline"
                disabled={
                  busy ||
                  props.savingRecordings > 0 ||
                  voice.starting ||
                  (!voice.listening && (!voice.supported || props.clipCount >= MAX_RECORDINGS))
                }
                aria-pressed={voice.listening}
                onClick={() => {
                  if (voice.listening) voice.stop();
                  else {
                    voiceBase.current = draft;
                    void voice.start();
                  }
                }}
              >
                {voice.listening ? "Stop recording" : "Speak"}
              </button>
            ) : null}
            <button
              type="button"
              className="button button--ghost"
              disabled={locked}
              onClick={() => void send("Skip", "(skipped)")}
            >
              Skip
            </button>
          </div>
          {props.voiceEnabled ? (
            <p className="hint">
              {voice.listening
                ? "Recording. It stops after two minutes."
                : `${props.clipCount} of ${MAX_RECORDINGS} recordings attached.`}{" "}
              {pending.length > 0 ? "Your recording will go with your next answer." : ""}{" "}
              {voice.supported
                ? ""
                : "Voice recording is not available in this browser: type instead."}
            </p>
          ) : null}
          {voice.error ? <p role="status">{voice.error}</p> : null}
        </div>
      )}
    </section>
  );
}

function Controls({
  question: q,
  onAnswer,
  disabled,
}: {
  question: Question;
  onAnswer: (text: string, value: Answer) => void;
  disabled: boolean;
}) {
  const [multi, setMulti] = useState<string[]>([]);
  if (q.type === "scale") {
    const max = q.max ?? 7;
    return (
      <fieldset className="controls" disabled={disabled}>
        <legend>{q.text}</legend>
        <div className="button-row">
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              className="button button--outline button--square"
              aria-label={`${n} out of ${max}`}
              onClick={() => onAnswer(String(n), n)}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="hint">
          1: {q.minLabel}. {max}: {q.maxLabel}.
        </p>
      </fieldset>
    );
  }
  if (q.type === "choice") {
    return (
      <fieldset className="controls" disabled={disabled}>
        <legend>{q.text}</legend>
        <div className="button-row">
          {q.options?.map((o) => (
            <button
              key={o.value}
              type="button"
              className="button button--outline"
              onClick={() => onAnswer(o.label, o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </fieldset>
    );
  }
  if (q.type === "multi") {
    return (
      <fieldset className="controls" disabled={disabled}>
        <legend>{q.text}</legend>
        <div className="button-row">
          {q.options?.map((o) => {
            const on = multi.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                className={on ? "button" : "button button--outline"}
                aria-pressed={on}
                disabled={!on && q.max !== undefined && multi.length >= q.max}
                onClick={() =>
                  setMulti((m) =>
                    m.includes(o.value) ? m.filter((v) => v !== o.value) : [...m, o.value],
                  )
                }
              >
                {o.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="button button--secondary"
          onClick={() =>
            onAnswer(
              multi.length > 0
                ? multi.map((v) => q.options?.find((o) => o.value === v)?.label ?? v).join(", ")
                : "None of these",
              multi.length > 0 ? multi : "(skipped)",
            )
          }
        >
          Continue
        </button>
      </fieldset>
    );
  }
  return null;
}
