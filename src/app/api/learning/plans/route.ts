import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { CreatePlanSchema } from "@/lib/validations";
import { handleError, parseBody, safeJson } from "@/lib/api";
import { generateSkillRoadmap } from "@/services/ai/learning-planner";
import { canonicalKey, canonicalName } from "@/lib/skills-catalog";

export async function GET() {
  try {
    const user = await requireAuthUser();
    const plans = await prisma.learningPlan.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" } });
    return NextResponse.json({ plans: plans.map((p) => ({ ...p, roadmapStages: safeJson(p.roadmapStages, []) })) });
  } catch (error) {
    return handleError(error, "Failed to load learning plans");
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuthUser();
    const body = await parseBody(req, CreatePlanSchema);
    if ("response" in body) return body.response;
    const name = canonicalName(body.data.skillName);
    const { targetRole, targetProficiency } = body.data;

    // one plan per skill, matched by canonical name so "docker" and "Docker" are the same plan
    const mine = await prisma.learningPlan.findMany({ where: { userId: user.id } });
    const existing = mine.find((p) => canonicalKey(p.skillName) === canonicalKey(name));
    if (existing) return NextResponse.json({ plan: { ...existing, roadmapStages: safeJson(existing.roadmapStages, []) }, existing: true });

    // start from what the profile already says about this skill
    const known = await prisma.candidateSkill.findMany({ where: { profile: { userId: user.id } }, select: { name: true, proficiencyLevel: true } });
    const current = known.find((s) => canonicalKey(s.name) === canonicalKey(name))?.proficiencyLevel || body.data.currentProficiency;

    const { stages, whyItMatters } = generateSkillRoadmap(name, targetRole, current, targetProficiency);
    const plan = await prisma.learningPlan.create({
      data: {
        userId: user.id, skillName: name, targetRole, currentProficiency: current, targetProficiency,
        status: "IN_PROGRESS", roadmapStages: JSON.stringify(stages), progressPercent: 0,
      },
    });
    return NextResponse.json({ plan: { ...plan, whyItMatters, roadmapStages: stages } });
  } catch (error) {
    return handleError(error, "Failed to create the learning plan");
  }
}
