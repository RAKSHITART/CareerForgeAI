import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { CandidateProfileSchema } from "@/lib/validations";
import { handleError, parseBody } from "@/lib/api";
import { loadProfile, profileChecklist } from "@/lib/profile-utils";

export async function GET() {
  try {
    const user = await requireAuthUser();
    const profile = await loadProfile(user);
    return NextResponse.json({ profile, checklist: profileChecklist(profile) });
  } catch (error) {
    return handleError(error, "Failed to load your profile");
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuthUser();
    const body = await parseBody(req, CandidateProfileSchema);
    if ("response" in body) return body.response;
    const data = body.data;
    const updated = await prisma.candidateProfile.upsert({
      where: { userId: user.id },
      update: data,
      create: { ...data, userId: user.id },
    });
    return NextResponse.json({ profile: updated });
  } catch (error) {
    return handleError(error, "Failed to save your profile");
  }
}
