import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128),
  role: z.enum(["KITCHEN", "CASHIER", "ADMIN"]),
});

export async function POST(request: Request) {
  const { user, response } = await requireRole(["ADMIN"]);
  if (response || !user) return response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a name, valid email, role, and password of at least 12 characters." }, { status: 400 });
  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { cafeId_email: { cafeId: user.cafeId, email } },
    select: { id: true },
  });
  if (existing) return NextResponse.json({ error: "A staff account with that email already exists." }, { status: 409 });
  const staff = await prisma.user.create({
    data: {
      cafeId: user.cafeId,
      name: parsed.data.name,
      email,
      passwordHash: await bcrypt.hash(parsed.data.password, 12),
      role: parsed.data.role,
    },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });
  return NextResponse.json(staff, { status: 201 });
}
