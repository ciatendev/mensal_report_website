import { NextResponse } from "next/server";
import { getApprovedUser } from "@/lib/auth-helpers";
import { generateSubmissionPdf, loadSubmission, submissionFileName } from "@/lib/submission-service";

interface Params { params: { id: string } }

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await getApprovedUser();
    if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

    const submission = await loadSubmission(params.id);
    if (!submission) return NextResponse.json({ error: "Relatório não encontrado." }, { status: 404 });
    if (user.role !== "SUPER_USER" && submission.submittedById !== user.id) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
    }

    const pdfBuffer = await generateSubmissionPdf(submission);
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${submissionFileName(submission)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[GET /api/submissions/:id/pdf] Erro:", error);
    return NextResponse.json({ error: "Não foi possível gerar o PDF." }, { status: 500 });
  }
}
