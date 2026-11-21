import { describe, it, expect, vi, afterEach } from "vitest";
import { computeJdSuggestions } from "@/services/ai/jd-gaps";
import { generateInterviewQuestions } from "@/services/ai/interview-engine";
import { evaluateCandidateAnswer, heuristicEvaluate } from "@/services/ai/answer-evaluator";
import { getTemplate, TEMPLATES, DEFAULT_TEMPLATE_ID } from "@/lib/templates";
import { UpdateResumeSchema, GenerateResumeSchema } from "@/lib/validations";

describe("resume builds from a JD without being blocked, and asks the user to confirm gaps", () => {
  const content: any = { prioritizedSkills: [{ category: "Frameworks", skills: [{ name: "React", level: "Advanced", status: "verified" }] }], learningSkills: ["Docker"] };
  const jd = { requiredTechnicalSkills: ["React", "Kubernetes", "PostgreSQL", "Docker", "TypeScript"], preferredTechnicalSkills: ["GraphQL"] };
  it("lists only skills that are not already on the resume, required first", () => {
    const snap = { skills: [{ name: "TypeScript", proficiencyLevel: "Not familiar" }], projects: [{ title: "Shop", technologies: ["PostgreSQL"] }] };
    const s = computeJdSuggestions(jd, content, snap);
    expect(s.map((x) => x.name)).toEqual(["PostgreSQL", "Kubernetes", "TypeScript", "GraphQL"]);   // React + Docker already present
    expect(s[0].reason).toBe("used-in-project");
    expect(s.find((x) => x.name === "TypeScript")!.reason).toBe("marked-not-familiar");
    expect(s.find((x) => x.name === "GraphQL")!.importance).toBe("preferred");
  });
  it("treats aliases as the same skill", () => {
    const s = computeJdSuggestions({ requiredTechnicalSkills: ["ReactJS"] }, content, {});
    expect(s).toEqual([]);
  });
});

describe("templates", () => {
  it("default is the Google style and old ids still resolve", () => {
    expect(DEFAULT_TEMPLATE_ID).toBe("google-style");
    expect(getTemplate("classic-professional").id).toBe("classic-serif");
    expect(getTemplate("something-removed").id).toBe("google-style");
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(5);
  });
  it("schemas accept an old template id and map it, instead of rejecting the save", () => {
    expect(UpdateResumeSchema.parse({ templateId: "classic-professional" }).templateId).toBe("classic-serif");
    expect(GenerateResumeSchema.parse({ targetRole: "Dev", targetCompany: "Acme" }).templateId).toBe("google-style");
    expect(UpdateResumeSchema.safeParse({ photoUrl: "data:text/html;base64,AAAA" }).success).toBe(false);
  });
});

describe("longer interviews never repeat a question", () => {
  it("'more' questions exclude what was already asked and keep numbering", () => {
    const first = generateInterviewQuestions("Backend Developer", "A", "TECHNICAL", "INTERMEDIATE", ["Python", "SQL"], { count: 5 });
    const more = generateInterviewQuestions("Backend Developer", "A", "TECHNICAL", "INTERMEDIATE", ["Python", "SQL"], { count: 3, excludeTexts: first.map((q) => q.questionText), startIndex: first.length });
    expect(more.length).toBe(3);
    const asked = new Set(first.map((q) => q.questionText));
    expect(more.every((q) => !asked.has(q.questionText))).toBe(true);
    expect(more.map((q) => q.questionIndex)).toEqual([6, 7, 8]);
  });
});

describe("answer evaluation", () => {
  it("gives the interviewer something natural to say, without numbers", () => {
    const r = heuristicEvaluate("q", ["Closures keep access to outer scope", "Event loop uses a microtask queue"], "I think closures are functions that remember variables from where they were created, so they keep access to the outer scope.", "Technical: JavaScript");
    expect(r.spokenReaction.length).toBeGreaterThan(10);
    expect(r.spokenReaction).not.toMatch(/\d/);
  });
  describe("with a Gemini key", () => {
    afterEach(() => { vi.unstubAllGlobals(); delete process.env.GEMINI_API_KEY; });
    it("sends no temperature, keeps a genuine score of 0, and uses the AI's reaction and follow-up", async () => {
      process.env.GEMINI_API_KEY = "test-key";
      const fetchMock = vi.fn(async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ score: 0, technicalCorrectness: 0, clarity: 40, completeness: 0, spokenReaction: "That is not quite right, let me probe a little.", feedbackWhatWasIncorrect: "A list is not a database.", followUpQuestion: "What is the difference between mutable and immutable?" }) }] } }] }), { status: 200 }));
      vi.stubGlobal("fetch", fetchMock);
      const r = await evaluateCandidateAnswer("What is a list?", ["ordered, mutable"], "A list is a kind of database on a server", "Dev", "BEGINNER", "Technical: Python");
      const sent = JSON.parse((fetchMock.mock.calls[0] as any)[1].body);
      expect(sent.generationConfig.temperature).toBeUndefined();
      expect(r.mode).toBe("ai");
      expect(r.score).toBe(0);                                   // used to become 70
      expect(r.spokenReaction).toMatch(/probe/);
      expect(r.followUpQuestion).toMatch(/mutable/);
    });
    it("falls back to the offline check (and says so) when Google rejects the request", async () => {
      process.env.GEMINI_API_KEY = "bad";
      vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 404 })));
      const r = await evaluateCandidateAnswer("q", ["a b c"], "some reasonably long answer with several words in it", "Dev", "BEGINNER");
      expect(r.mode).toBe("heuristic");
    });
  });
});
