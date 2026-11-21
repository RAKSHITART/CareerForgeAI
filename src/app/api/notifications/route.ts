import { NextResponse } from "next/server";
import { handleError } from "@/lib/api";
import { requireAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

/** Turn due follow-ups and upcoming interviews into notifications, once each. */
async function createReminders(userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
  const open = ["INTERESTED", "APPLIED", "ASSESSMENT", "INTERVIEW"];
  const apps = await prisma.jobApplication.findMany({
    where: { userId, status: { in: open }, OR: [{ followUpDate: { lte: today, not: null } }, { interviewDate: { gte: today, lte: soon } }] },
  });
  for (const a of apps) {
    const items: { title: string; message: string; link: string }[] = [];
    const link = `/dashboard/job-tracker?app=${a.id}`;
    if (a.followUpDate && a.followUpDate <= today) items.push({ title: `Follow up: ${a.company} (${a.followUpDate})`, message: `Time to follow up on your ${a.role} application at ${a.company}.`, link });
    if (a.interviewDate && a.interviewDate >= today && a.interviewDate <= soon) items.push({ title: `Interview coming up: ${a.company} (${a.interviewDate})`, message: `Your ${a.role} interview at ${a.company} is on ${a.interviewDate}. Run a mock interview to prepare.`, link });
    for (const it of items) {
      const exists = await prisma.notification.findFirst({ where: { userId, title: it.title, link: it.link } });
      if (!exists) await prisma.notification.create({ data: { userId, type: "FOLLOW_UP", ...it } });
    }
  }
}

export async function GET() {
  try {
    const user = await requireAuthUser();

    await createReminders(user.id);

    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    return handleError(error, "Failed to fetch notifications");
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireAuthUser();
    const body = await req.json();
    const { id } = body;

    if (id) {
      await prisma.notification.updateMany({
        where: { id, userId: user.id },
        data: { isRead: true },
      });
    } else {
      await prisma.notification.updateMany({
        where: { userId: user.id },
        data: { isRead: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, "Failed to update notification");
  }
}
