// AUTHORED-BY Claude Opus 5.5
/**
 * The plain questionnaire: every question of the guide as a form, grouped by stage, every field
 * optional. Shown when the interviewer is not switched on, when the visitor prefers it, and when
 * the interviewer fails part-way (the answers carry over). Per-demo questions appear once the
 * visitor says which demos they saw.
 */
import {
  type Answer,
  type Answers,
  MAX_ANSWER,
  type Question,
  questionById,
  questionnaireSections,
} from "@mortgage/feedback";
import { useId } from "react";

export interface QuestionnaireProps {
  answers: Answers;
  onChange: (id: string, value: Answer | undefined) => void;
  disabled?: boolean;
}

export function Questionnaire({ answers, onChange, disabled = false }: QuestionnaireProps) {
  const general = questionById("general");
  const sections = questionnaireSections(answers);
  return (
    <div className="questionnaire">
      {general === undefined ? null : (
        <section className="q-section" aria-labelledby="q-own-words">
          <h2 id="q-own-words">In your own words</h2>
          <Field
            question={general}
            value={answers.general}
            onChange={onChange}
            disabled={disabled}
          />
        </section>
      )}
      {sections.map((section, index) => {
        const headingId = `q-stage-${index}`;
        return (
          <section key={section.stage} className="q-section" aria-labelledby={headingId}>
            <h2 id={headingId}>{section.stage}</h2>
            {section.questions.map((question) => (
              <Field
                key={question.id}
                question={question}
                value={answers[question.id]}
                onChange={onChange}
                disabled={disabled}
              />
            ))}
          </section>
        );
      })}
    </div>
  );
}

interface FieldProps {
  question: Question;
  value: Answer | undefined;
  onChange: (id: string, value: Answer | undefined) => void;
  disabled: boolean;
}

function Field({ question: q, value, onChange, disabled }: FieldProps) {
  const id = useId();
  if (q.type === "text") {
    return (
      <div className="q-field">
        <label htmlFor={id}>
          {q.text}
          {q.optional ? <span className="q-optional"> (optional)</span> : null}
        </label>
        <textarea
          id={id}
          rows={3}
          maxLength={MAX_ANSWER}
          disabled={disabled}
          value={typeof value === "string" && value !== "(skipped)" ? value : ""}
          onChange={(event) =>
            onChange(q.id, event.target.value === "" ? undefined : event.target.value)
          }
        />
      </div>
    );
  }
  if (q.type === "scale") {
    const max = q.max ?? 7;
    return (
      <fieldset className="q-field q-scale" disabled={disabled}>
        <legend>{q.text}</legend>
        <div className="q-scale__options">
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
            <label key={n} className="q-scale__option">
              <input
                type="radio"
                name={`${id}-${q.id}`}
                value={n}
                checked={value === n}
                onChange={() => onChange(q.id, n)}
                aria-label={`${n} out of ${max}`}
              />
              <span aria-hidden="true">{n}</span>
            </label>
          ))}
        </div>
        <p className="q-hint">
          1: {q.minLabel}. {max}: {q.maxLabel}.
        </p>
      </fieldset>
    );
  }
  if (q.type === "choice") {
    return (
      <fieldset className="q-field" disabled={disabled}>
        <legend>{q.text}</legend>
        <div className="q-options">
          {q.options?.map((option) => (
            <label key={option.value} className="q-option">
              <input
                type="radio"
                name={`${id}-${q.id}`}
                value={option.value}
                checked={value === option.value}
                onChange={() => onChange(q.id, option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }
  const picked = Array.isArray(value) ? value : [];
  const full = q.max !== undefined && picked.length >= q.max;
  return (
    <fieldset className="q-field" disabled={disabled}>
      <legend>{q.text}</legend>
      <div className="q-options">
        {q.options?.map((option) => {
          const checked = picked.includes(option.value);
          return (
            <label key={option.value} className="q-option">
              <input
                type="checkbox"
                value={option.value}
                checked={checked}
                disabled={!checked && full}
                onChange={() => {
                  const next = checked
                    ? picked.filter((v) => v !== option.value)
                    : [...picked, option.value];
                  onChange(q.id, next.length === 0 ? undefined : next);
                }}
              />
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
      {q.max === undefined ? null : <p className="q-hint">Choose up to {q.max}.</p>}
    </fieldset>
  );
}
