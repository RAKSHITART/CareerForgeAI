import { TailoredBulletPoint } from "./types";

/** The text that actually goes on the resume: the user's rejection restores their original wording. */
export function bulletText(b: TailoredBulletPoint): string {
  return (b.status === "rejected" ? b.original : b.tailored || b.original).trim();
}
