import { NextResponse } from "next/server";
import { z } from "zod";
import { handleError, parseBody, safeJson } from "@/lib/api";
import { requireAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

const ToggleSchema = z.object({ exerciseId: z.string().min(1).max(40), isCompleted: z.boolean() });

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuthUser();
    const body = await parseBody(req, ToggleSchema);
    if ("response" in body) return body.response;
    const { exerciseId, isCompleted } = body.data;

    const plan = await prisma.learningPlan.findFirst({ where: { id: params.id, userId: user.id } });
    if (!plan) return NextResponse.json({ error: "Learning plan not found" }, { status: 404 });

    const stages = safeJson<any[]>(plan.roadmapStages, []);
    let total = 0, done = 0, found = false;
    for (const stg of stages) {
      for (const ex of stg.practicalExercises || []) {
        total++;
        if (ex.id === exerciseId) { ex.isCompleted = isCompleted; found = true; }
        if (ex.isCompleted) done++;
      }
    }
    if (!found) return NextResponse.json({ error: "That exercise is not part of this plan" }, { status: 404 });

    const progressPercent = total ? Math.round((done / total) * 100) : 0;
    const updated = await prisma.learningPlan.update({
      where: { id: plan.id },
      data: { roadmapStages: JSON.stringify(stages), progressPercent, status: progressPercent === 100 ? "COMPLETED" : "IN_PROGRESS" },
    });
    return NextResponse.json({ plan: { ...updated, roadmapStages: stages } });
  } catch (error) {
    return handleError(error, "Failed to update the exercise");
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuthUser();
    const r = await prisma.learningPlan.deleteMany({ where: { id: params.id, userId: user.id } });
    if (r.count === 0) return NextResponse.json({ error: "Learning plan not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, "Failed to delete the learning plan");
  }
}
