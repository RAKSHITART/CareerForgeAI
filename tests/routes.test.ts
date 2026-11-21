import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";

// ---- a tiny in-memory stand-in for the parts of Prisma these routes use ----
const db: any = { users: [], tokens: [], plans: [], skills: [], evidence: [], notes: [], resumes: [], jds: [] };
const reset = () => { for (const k of Object.keys(db)) db[k] = []; };

vi.mock("@/lib/prisma", () => ({
  default: {
    user: { findUnique: async ({ where }: any) => db.users.find((u: any) => u.id === where.id || u.email === where.email) || null, update: async ({ where, data }: any) => { const u = db.users.find((x: any) => x.id === where.id); if (data.passwordHash) u.passwordHash = data.passwordHash; if (data.tokenVersion) u.tokenVersion += data.tokenVersion.increment; return u; } },
    passwordResetToken: {
      findUnique: async ({ where }: any) => db.tokens.find((t: any) => t.tokenHash === where.tokenHash) || null,
      deleteMany: async ({ where }: any) => { db.tokens = db.tokens.filter((t: any) => t.userId !== where.userId); return {}; },
      create: async ({ data }: any) => { db.tokens.push(data); return data; },
    },
    $transaction: async (ops: any[]) => Promise.all(ops),
    learningPlan: { findMany: async () => db.plans },
    candidateProfile: { findUnique: async () => ({ id: "prof1" }) },
    candidateSkill: {
      findMany: async () => db.skills,
      create: async ({ data }: any) => { const s = { id: `s${db.skills.length + 1}`, ...data }; db.skills.push(s); return s; },
      update: async ({ where, data }: any) => { const s = db.skills.find((x: any) => x.id === where.id); Object.assign(s, data); return s; },
    },
    skillEvidence: { create: async ({ data }: any) => { db.evidence.push(data); return data; } },
    notification: { create: async ({ data }: any) => { db.notes.push(data); return data; } },
    jobDescription: { findFirst: async () => db.jds[0] || null },
    resumeVersion: {
      findFirst: async () => db.resumes[0] || null,
      update: async ({ data }: any) => { Object.assign(db.resumes[0], data); return db.resumes[0]; },
      updateMany: async () => ({}),
    },
  },
}));
vi.mock("@/lib/auth", async () => {
  const actual: any = await vi.importActual("@/lib/auth");
  return { ...actual, requireAuthUser: async () => ({ id: "u1", email: "a@b.co", name: "A" }), hashPassword: async (p: string) => `hash:${p}` };
});

const json = (body: unknown, method = "POST") => new Request("http://x/api", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

beforeEach(() => { reset(); });

describe("password reset (was: anyone could reset anyone with just an email)", () => {
  it("the old email-only request is rejected", async () => {
    const { POST } = await import("@/app/api/auth/reset-password/route");
    const res = await POST(json({ email: "victim@x.com", newPassword: "hacked123" }));
    expect(res.status).toBe(400);
  });
  it("a valid emailed token works once; the raw token is never stored; an expired token fails", async () => {
    const { POST } = await import("@/app/api/auth/reset-password/route");
    db.users.push({ id: "u1", email: "a@b.co", passwordHash: "old", tokenVersion: 0 });
    const raw = crypto.randomBytes(32).toString("hex");
    db.tokens.push({ userId: "u1", tokenHash: crypto.createHash("sha256").update(raw).digest("hex"), expiresAt: new Date(Date.now() + 60_000), usedAt: null });
    const ok = await POST(json({ token: raw, newPassword: "newpass123" }));
    expect(ok.status).toBe(200);
    expect(db.users[0].passwordHash).toBe("hash:newpass123");
    expect(db.users[0].tokenVersion).toBe(1);            // old sessions invalidated
    const again = await POST(json({ token: raw, newPassword: "another123" }));
    expect(again.status).toBe(400);                        // single use
    const expiredRaw = crypto.randomBytes(32).toString("hex");
    db.tokens.push({ userId: "u1", tokenHash: crypto.createHash("sha256").update(expiredRaw).digest("hex"), expiresAt: new Date(Date.now() - 1000), usedAt: null });
    expect((await POST(json({ token: expiredRaw, newPassword: "newpass456" }))).status).toBe(400);
  });
});

describe("skill promotion (was: any skill at any level, no work required, auto 'used in project')", () => {
  const call = async (body: any) => (await import("@/app/api/learning/verify-skill/route")).POST(json(body));
  it("refuses with no roadmap", async () => {
    expect((await call({ skillName: "Kubernetes", confirmedProficiency: "Expert" })).status).toBe(400);
  });
  it("refuses below 30% progress", async () => {
    db.plans.push({ skillName: "Docker", progressPercent: 0 });
    const r = await call({ skillName: "Docker", confirmedProficiency: "Expert" });
    expect(r.status).toBe(400);
    expect(db.skills).toHaveLength(0);
  });
  it("caps the level to what progress supports and never invents project usage", async () => {
    db.plans.push({ skillName: "Docker", progressPercent: 70 });
    const r = await call({ skillName: "Docker", confirmedProficiency: "Expert" });
    const body = await r.json();
    expect(body.appliedLevel).toBe("Beginner");
    expect(body.capped).toBe(true);
    expect(db.skills[0].usedInProject).toBe(false);
    expect(db.evidence).toHaveLength(0);                   // no note -> no fabricated evidence
  });
  it("needs a real description to claim project use, and to unlock Intermediate at 100%", async () => {
    db.plans.push({ skillName: "Docker", progressPercent: 100 });
    expect((await call({ skillName: "Docker", confirmedProficiency: "Intermediate", usedInProject: true })).status).toBe(400);
    const r = await call({ skillName: "Docker", confirmedProficiency: "Intermediate", usedInProject: true, evidenceNote: "Containerised my blog API with a compose file and CI build." });
    expect((await r.json()).appliedLevel).toBe("Intermediate");
    expect(db.evidence).toHaveLength(1);
  });
  it("never lowers an existing higher level", async () => {
    db.plans.push({ skillName: "Docker", progressPercent: 40 });
    db.skills.push({ id: "s1", name: "Docker", proficiencyLevel: "Advanced", profileId: "prof1" });
    const r = await call({ skillName: "Docker", confirmedProficiency: "Just started" });
    expect((await r.json()).appliedLevel).toBe("Advanced");
  });
});

describe("resume save (was: client could PUT anything and keep a 'STRICTLY_VERIFIED' badge)", () => {
  it("removes skills not in the profile and caps levels on the server", async () => {
    const { PUT } = await import("@/app/api/resumes/[id]/route");
    db.resumes.push({ id: "r1", userId: "u1", snapshotProfileData: JSON.stringify({ skills: [{ name: "React", proficiencyLevel: "Intermediate" }, { name: "Docker", proficiencyLevel: "Just started" }] }), tailoredContent: "{}" });
    const content = {
      professionalSummary: { text: "x", highlightedSkills: [], honestBasis: "" }, tailoredProjects: [], tailoredExperience: [], sectionOrdering: [],
      learningSkills: [],
      prioritizedSkills: [{ category: "Mixed", skills: [
        { name: "React", level: "Expert", status: "verified" }, { name: "Kubernetes", level: "Expert", status: "verified" }, { name: "Docker", level: "Advanced", status: "verified" } ] }],
      antiFabricationAudit: { checkedAt: "", unverifiedSkillsRemoved: [], exaggerationsRejected: [], verdict: "STRICTLY_VERIFIED" },
    };
    const res = await PUT(json({ tailoredContent: content }, "PUT"), { params: { id: "r1" } });
    expect(res.status).toBe(200);
    const saved = JSON.parse(db.resumes[0].tailoredContent);
    const names = saved.prioritizedSkills.flatMap((c: any) => c.skills.map((s: any) => `${s.name}:${s.level}`));
    expect(names).toEqual(["React:Intermediate"]);          // Expert capped; Kubernetes removed; Docker moved
    expect(saved.learningSkills).toContain("Docker");
    expect(saved.antiFabricationAudit.verdict).toBe("WARNINGS_REVIEWED");
    expect(saved.antiFabricationAudit.exaggerationsRejected.length).toBeGreaterThanOrEqual(2);
  });
  it("rejects malformed content", async () => {
    const { PUT } = await import("@/app/api/resumes/[id]/route");
    db.resumes.push({ id: "r1", userId: "u1", snapshotProfileData: "{}", tailoredContent: "{}" });
    expect((await PUT(json({ tailoredContent: { nope: true } }, "PUT"), { params: { id: "r1" } })).status).toBe(400);
  });
});

describe("building a resume for a job is never blocked; the user confirms skills one by one", () => {
  const setup = () => {
    db.jds.push({ id: "jd1", extractedData: JSON.stringify({ requiredTechnicalSkills: ["React", "Kubernetes"], preferredTechnicalSkills: ["GraphQL"] }) });
    db.resumes.push({
      id: "r1", userId: "u1", jobDescriptionId: "jd1",
      snapshotProfileData: JSON.stringify({ skills: [{ name: "React", proficiencyLevel: "Intermediate" }], projects: [], workExperience: [] }),
      tailoredContent: JSON.stringify({
        professionalSummary: { text: "", highlightedSkills: [], honestBasis: "" }, tailoredProjects: [], tailoredExperience: [], sectionOrdering: [], learningSkills: [],
        prioritizedSkills: [{ category: "Frameworks", skills: [{ name: "React", level: "Intermediate", status: "verified" }] }],
        antiFabricationAudit: { checkedAt: "", unverifiedSkillsRemoved: [], exaggerationsRejected: [], verdict: "STRICTLY_VERIFIED" },
      }),
    });
  };
  const add = async (body: any) => (await import("@/app/api/resumes/[id]/skills/route")).POST(json(body), { params: { id: "r1" } });

  it("GET shows the skills the job wants that are missing, without adding anything", async () => {
    setup();
    const { GET } = await import("@/app/api/resumes/[id]/route");
    const res = await GET(new Request("http://x"), { params: { id: "r1" } });
    const body = await res.json();
    expect(body.suggestions.map((s: any) => s.name)).toEqual(["Kubernetes", "GraphQL"]);
    expect(db.skills).toHaveLength(0);
  });
  it("'I have this' saves the skill to the profile at the user's level and puts it on the resume", async () => {
    setup();
    const res = await add({ name: "kubernetes", level: "Beginner", note: "Deployed my blog API to a local cluster" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(db.skills[0]).toMatchObject({ name: "Kubernetes", proficiencyLevel: "Beginner" });
    expect(body.tailoredContent.prioritizedSkills.flatMap((c: any) => c.skills.map((s: any) => s.name))).toContain("Kubernetes");
    expect(body.suggestions.map((s: any) => s.name)).toEqual(["GraphQL"]);
    // and the server audit on a later save keeps it, because it is now in the verified snapshot
    const { PUT } = await import("@/app/api/resumes/[id]/route");
    const saved = await (await PUT(json({ tailoredContent: body.tailoredContent }, "PUT"), { params: { id: "r1" } })).json();
    expect(saved.tailoredContent.prioritizedSkills.flatMap((c: any) => c.skills.map((s: any) => s.name))).toContain("Kubernetes");
  });
  it("'Just started' goes to 'currently learning', not the skills list", async () => {
    setup();
    const body = await (await add({ name: "Kubernetes", level: "Just started" })).json();
    expect(body.tailoredContent.learningSkills).toContain("Kubernetes");
    expect(body.tailoredContent.prioritizedSkills.flatMap((c: any) => c.skills.map((s: any) => s.name))).not.toContain("Kubernetes");
  });
  it("cannot be used to add a skill as 'Not familiar'", async () => {
    setup();
    expect((await add({ name: "Kubernetes", level: "Not familiar" })).status).toBe(400);
  });
});
