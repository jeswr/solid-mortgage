// AUTHORED-BY Claude Opus 5.5
/**
 * The post-production that takes the dead air out of a recording (lib/tighten.ts): a wait that
 * outlasts the words is fast-forwarded to the deliberate break, short breaks are left alone,
 * the end card is held for TAIL, and the time map moves clips, captions and chapters with it.
 */
import { describe, expect, test } from "vitest";
import { BREAK, FAST, HEAD, mapTime, plan, retimeArgs, setptsExpr, TAIL } from "../lib/tighten.ts";

const clip = (at: number, end: number, allowed = BREAK) => ({ at, end, allowed });

describe("tighten", () => {
  test("deliberate breaks are left alone", () => {
    const p = plan([clip(0.35, 5), clip(5.85, 9), clip(9.9, 12)], 13.5);
    expect(p.spans).toEqual([]);
    expect(p.duration).toBe(13.5);
  });

  test("a long wait becomes the deliberate break", () => {
    // Words end at 5 s; the app works until 28 s; the next paragraph starts at 28.85 s.
    const p = plan([clip(0.35, 5), clip(28.85, 32)], 33);
    expect(p.spans).toHaveLength(1);
    const [s] = p.spans;
    expect(s?.from).toBeCloseTo(5 + HEAD);
    expect(s?.out).toBe(FAST);
    // The next clip now starts one break after the words end.
    expect(mapTime(p.spans, 28.85) - mapTime(p.spans, 5)).toBeCloseTo(BREAK);
    expect(p.gaps[0]?.was).toBeCloseTo(23.85);
    // Before the wait nothing moves; after it everything moves by the time taken out.
    expect(mapTime(p.spans, 3)).toBe(3);
    expect(mapTime(p.spans, 30) - mapTime(p.spans, 29)).toBeCloseTo(1);
    expect(p.duration).toBeCloseTo(mapTime(p.spans, 33));
  });

  test("a [pause] lengthens the break it follows", () => {
    const p = plan([clip(0.35, 5, BREAK + 2), clip(10, 12)], 13);
    expect(mapTime(p.spans, 10) - mapTime(p.spans, 5)).toBeCloseTo(BREAK + 2);
  });

  test("the end card is held for TAIL after the last word", () => {
    const p = plan([clip(0.35, 5, BREAK + 2.5)], 9.2);
    expect(p.duration - mapTime(p.spans, 5)).toBeCloseTo(TAIL);
  });

  test("the time map is monotonic and matches the setpts expression", () => {
    const p = plan([clip(0.35, 5), clip(20, 25), clip(26, 30), clip(60, 70)], 75);
    const expr = setptsExpr(p.spans).replace(/\/TB$/, "");
    const evalAt = (T: number) =>
      Function(
        "T",
        "clip",
        `return ${expr};`,
      )(T, (x: number, lo: number, hi: number) => Math.min(Math.max(x, lo), hi)) as number;
    let prev = -1;
    for (let t = 0; t <= 75; t += 0.25) {
      const m = mapTime(p.spans, t);
      expect(m).toBeGreaterThanOrEqual(prev);
      expect(evalAt(t)).toBeCloseTo(m, 2);
      prev = m;
    }
    expect(retimeArgs("in.mp4", "out.mp4", p.spans, 30, 18).join(" ")).toMatch(
      /setpts='\(T-.*\)\/TB',fps=30/,
    );
  });
});
