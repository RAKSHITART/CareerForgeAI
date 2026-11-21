import { describe, it, expect } from "vitest";
import { generateSkillRoadmap } from "@/services/ai/learning-planner";

describe("learning planner", () => {
  it("returns skill-appropriate content (no 'Hello Communication' coding exercises)", () => {
    const soft = generateSkillRoadmap("Communication", "SWE", "Not familiar", "Intermediate");
    expect(JSON.stringify(soft)).not.toMatch(/\b(script|CLI|runtime|syntax)\b/i);
    const lang = generateSkillRoadmap("Python", "SWE", "Not familiar", "Intermediate");
    expect(lang.stages[0].verifiedResources.some((r) => r.url.includes("docs.python.org"))).toBe(true);
  });
  it("respects current and target level", () => {
    const fromZero = generateSkillRoadmap("Docker", "x", "Not familiar", "Beginner");
    const advanced = generateSkillRoadmap("Docker", "x", "Advanced", "Expert");
    expect(fromZero.stages.map((s) => s.stage)).toEqual(["Beginner"]);
    expect(advanced.stages.map((s) => s.stage)).toEqual(["Advanced"]);
  });
  it("exercise ids are stable and unique", () => {
    const r = generateSkillRoadmap("Kubernetes", "x", "Not familiar", "Advanced");
    const ids = r.stages.flatMap((s) => s.practicalExercises.map((e) => e.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe("ex-beg-0");
  });
});
