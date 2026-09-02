import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getApprovedUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getApprovedUser();
  if (!user || user.role !== "SUPER_USER") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  return NextResponse.json(users);
}

const updateSchema = z.object({
  userId: z.string().min(1),
  status: z.enum(["PENDING", "APPROVED", "BLOCKED"]).optional(),
  role: z.enum(["USER", "SUPER_USER"]).optional(),
});

export async function PATCH(req: NextRequest) {
  const currentUser = await getApprovedUser();
  if (!currentUser || currentUser.role !== "SUPER_USER") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: parsed.data.userId },
    data: {
      status: parsed.data.status,
      role: parsed.data.role,
      approvedById:
        parsed.data.status === "APPROVED" ? currentUser.id : undefined,
    },
  });

  return NextResponse.json(updated);
}

const preRegisterSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const currentUser = await getApprovedUser();
  if (!currentUser || currentUser.role !== "SUPER_USER") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const body = await req.json();
  const parsed = preRegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
  }

  const newUser = await prisma.user.upsert({
    where: { email: parsed.data.email },
    update: { status: "APPROVED", approvedById: currentUser.id },
    create: {
      email: parsed.data.email,
      name: parsed.data.name,
      status: "APPROVED",
      role: "USER",
      approvedById: currentUser.id,
    },
  });

  return NextResponse.json(newUser, { status: 201 });
}
