import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
  cafeSlug: z.string().trim().toLowerCase().min(1).max(80),
});

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }

  const { email, password, cafeSlug } = parsed.data;
  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase(), cafe: { slug: cafeSlug }, isActive: true },
  });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  }

  await createSession(user.id);
  return NextResponse.json({ role: user.role, name: user.name });
}
