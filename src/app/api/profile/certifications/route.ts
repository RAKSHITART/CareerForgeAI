import { NextResponse } from "next/server";
import { handleError, validationResponse } from "@/lib/api";
import { requireAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { CertificationItemSchema } from "@/lib/validations";

export async function GET() {
  try {
    const user = await requireAuthUser();
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!profile) return NextResponse.json({ certifications: [] });

    const certifications = await prisma.certification.findMany({
      where: { profileId: profile.id },
      orderBy: { issueDate: "desc" },
    });
    return NextResponse.json({ certifications });
  } catch (error) {
    return handleError(error, "Failed to fetch certifications");
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuthUser();
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const body = await req.json();
    const parsed = CertificationItemSchema.safeParse(body);
    if (!parsed.success) return validationResponse(parsed.error);

    const cert = await prisma.certification.create({
      data: {
        profileId: profile.id,
        ...parsed.data,
      },
    });
    return NextResponse.json({ certification: cert });
  } catch (error) {
    return handleError(error, "Failed to add certification");
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireAuthUser();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await prisma.certification.deleteMany({
      where: { id, profile: { userId: user.id } },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, "Failed to delete certification");
  }
}
