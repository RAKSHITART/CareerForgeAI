import { describe, it, expect } from "vitest";
import { generateInterviewQuestions } from "@/services/ai/interview-engine";
import { evaluateCandidateAnswer, heuristicEvaluate } from "@/services/ai/answer-evaluator";

delete process.env.GEMINI_API_KEY;

describe("interview engine", () => {
  it("interview type changes the questions", () => {
    const hr = generateInterviewQuestions("Frontend Developer", "Acme", "HR", "BEGINNER", ["React"]);
    const tech = generateInterviewQuestions("Frontend Developer", "Acme", "TECHNICAL", "BEGINNER", ["React"]);
    expect(hr[0].questionText).not.toEqual(tech[0].questionText);
    expect(hr.every((q) => q.category === "HR")).toBe(true);
  });
  it("difficulty changes technical questions", () => {
    const a = generateInterviewQuestions("Dev", "A", "TECHNICAL", "BEGINNER", ["React"]);
    const b = generateInterviewQuestions("Dev", "A", "TECHNICAL", "ADVANCED", ["React"]);
    expect(a[0].questionText).not.toEqual(b[0].questionText);
  });
  it("uses the candidate's / JD's own skills and projects", () => {
    const q = generateInterviewQuestions("Data Scientist", "A", "TECHNICAL", "INTERMEDIATE", [], { jdSkills: ["Docker"] });
    expect(q[0].category).toContain("Docker");
    const p = generateInterviewQuestions("Dev", "A", "PROJECT_BASED", "INTERMEDIATE", [], { projects: [{ title: "ShopX", technologies: ["React"] }], count: 3 });
    expect(p[0].questionText).toContain("ShopX");
  });
  it("respects the requested number of questions", () => {
    expect(generateInterviewQuestions("Dev", "A", "MIXED", "INTERMEDIATE", ["Python"], { count: 8 })).toHaveLength(8);
  });
});

describe("answer evaluator (offline)", () => {
  const kp = ["Virtual DOM is an in-memory representation of the real DOM", "Reconciliation diffs the old and new trees", "Keys give list items a stable identity"];
  it("scores gibberish and empty-ish answers low", async () => {
    const junk = await evaluateCandidateAnswer("q", kp, "blah ".repeat(30), "Dev", "INTERMEDIATE");
    expect(junk.score).toBeLessThan(30);
    expect(junk.mode).toBe("heuristic");
  });
  it("rewards an answer that covers the points", async () => {
    const good = await evaluateCandidateAnswer("q", kp, "The virtual DOM is an in-memory representation of the real DOM. Reconciliation diffs the old tree against the new tree to find minimal updates. Keys give list items a stable identity, for example when reordering.", "Dev", "INTERMEDIATE");
    expect(good.score).toBeGreaterThan(70);
  });
  it("is honest that it cannot verify facts", () => {
    const r = heuristicEvaluate("q", kp, "The virtual DOM is a database that stores everything on the server and keys are bad.", "Technical");
    expect(r.feedbackWhatWasIncorrect).toMatch(/cannot verify/i);
  });
  it("accepts a STAR-style behavioral answer", () => {
    const r = heuristicEvaluate("q", ["clear situation", "your actions", "result"], "During my internship the team had a failing deploy. I decided to add logging and I fixed the config. As a result the deploy time dropped and I learned to check environments first.", "Behavioral (STAR)");
    expect(r.completeness).toBeGreaterThanOrEqual(75);
  });
});
