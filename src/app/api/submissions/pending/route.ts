import { NextResponse } from "next/server";
import { getApprovedUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getApprovedUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const reports = await prisma.submission.findMany({
      where: {
        submittedById: user.id,
        deliveryStatus: { in: ["FAILED", "QUEUED", "PENDING"] },
      },
      select: {
        id: true,
        submittedByName: true,
        createdAt: true,
        deliveryStatus: true,
        deliveryAttempts: true,
        lastDeliveryError: true,
        queuedAt: true,
        template: { select: { title: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(reports);
  } catch (error) {
    console.error("Erro ao listar relatórios pendentes:", error);
    return NextResponse.json(
      {
        error:
          "Não foi possível carregar os relatórios pendentes. Verifique se as migrations do Prisma foram aplicadas.",
      },
      { status: 500 }
    );
  }
}
