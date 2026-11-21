import { describe, it, expect } from "vitest";
import { SKILL_CATALOG, IMPLIES, canonicalKey, canonicalName, detectSkills } from "@/lib/skills-catalog";
import { RELATED } from "@/services/ai/skill-matcher";

const keys = new Set(SKILL_CATALOG.map((s) => s.key));

describe("skills catalog", () => {
  it("has unique keys and a healthy size", () => {
    expect(keys.size).toBe(SKILL_CATALOG.length);
    expect(SKILL_CATALOG.length).toBeGreaterThan(250);
  });
  it("every key referenced by IMPLIES / RELATED exists in the catalog", () => {
    const refs = [...Object.keys(IMPLIES), ...Object.values(IMPLIES).flat(), ...Object.keys(RELATED), ...Object.values(RELATED).flat()];
    const bad = refs.filter((k) => !keys.has(k));
    expect(bad).toEqual([]);
  });
  it("collapses common spellings to one skill", () => {
    expect(canonicalKey("ReactJS")).toBe(canonicalKey("React.js"));
    expect(canonicalName("postgres")).toBe("PostgreSQL");
    expect(canonicalName("k8s")).toBe("Kubernetes");
    expect(canonicalName("node js")).toBe("Node.js");
  });
  it("does not invent skills from plain English", () => {
    const text = "We are a fast-moving R&D team. Ready to go the extra mile? Express interest. Swift decisions. Spring 2025 internship. Scrum Master. We trust our people.";
    expect(detectSkills(text).map((h) => h.skill.name)).toEqual([]);
  });
  it("finds real skills, longest match first", () => {
    const names = detectSkills("React Native, Spring Boot, C++ and C#, Next.js, GitHub Actions, Python, Pandas").map((h) => h.skill.name);
    for (const n of ["React Native", "Spring Boot", "C++", "C#", "Next.js", "GitHub Actions", "Python", "Pandas"]) expect(names).toContain(n);
    expect(names).not.toContain("React");
    expect(names).not.toContain("Spring");
  });
});
