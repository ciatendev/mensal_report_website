import { prisma } from "@/lib/prisma";
import type { TemplateQuestion } from "@prisma/client";
import { generateReportPdf, type QuestionAnswer } from "@/lib/puppeteer";
import { sendReportEmail } from "@/lib/mailer";

export type SubmissionAnswerInput = {
  questionId: string;
  value: string;
};

function questionOptions(question: TemplateQuestion) {
  return Array.isArray(question.options)
    ? question.options.filter((option): option is string => typeof option === "string")
    : [];
}

function parseConditionalAnswer(value: string) {
  try {
    const parsed = JSON.parse(value || "{}");
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export function validateSubmissionAnswers(
  questions: TemplateQuestion[],
  answers: SubmissionAnswerInput[]
) {
  const byQuestion = new Map<string, SubmissionAnswerInput[]>();
  for (const answer of answers) {
    const question = questions.find((candidate) => candidate.id === answer.questionId);
    if (!question) return "Uma das respostas não pertence a este modelo.";
    const list = byQuestion.get(answer.questionId) ?? [];
    list.push(answer);
    byQuestion.set(answer.questionId, list);
  }

  for (const question of questions) {
    const current = byQuestion.get(question.id) ?? [];
    if (!question.isRepeatable && current.length > 1) {
      return `A pergunta "${question.label}" recebeu respostas duplicadas.`;
    }
    if (question.isRequired) {
      const hasValue = current.some((answer) => answer.value.trim().length > 0);
      if (!hasValue) return `A pergunta obrigatória "${question.label}" não foi respondida.`;
    }

    for (const answer of current) {
      const value = answer.value.trim();
      if (!value) continue;
      if (question.type === "SELECT" && !questionOptions(question).includes(value)) {
        return `A opção escolhida para "${question.label}" não é permitida.`;
      }
      if (question.type === "CHECKBOX") {
        const selected = value.split(",").map((item) => item.trim()).filter(Boolean);
        if (selected.some((item) => !questionOptions(question).includes(item))) {
          return `Uma opção selecionada em "${question.label}" não é permitida.`;
        }
      }
      if (question.type === "YES_NO_JUSTIFY") {
        const parsed = parseConditionalAnswer(value);
        const status = parsed?.status;
        if (status !== "SIM" && status !== "NAO") {
          return `Informe SIM ou NÃO em "${question.label}".`;
        }
        if (status === "NAO" && String(parsed?.justification ?? "").trim().length === 0) {
          return `A justificativa de "${question.label}" é obrigatória quando a resposta é NÃO.`;
        }
        const links = parsed?.links;
        if (links !== undefined && (!Array.isArray(links) || links.some((link) => {
          if (!link || typeof link !== "object") return true;
          const item = link as { text?: unknown; url?: unknown };
          return typeof item.text !== "string" || typeof item.url !== "string" || !/^https?:\/\//i.test(item.url);
        }))) {
          return `Há um link inválido no adendo de "${question.label}".`;
        }
      }
    }
  }

  return null;
}

export type PdfSubmissionRecord = Awaited<ReturnType<typeof loadSubmission>>;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function renderRichText(value: string | null | undefined) {
  if (!value) return "";
  const markdownLink = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi;
  const url = /(https?:\/\/[^\s<]+)/gi;
  let html = "";
  let cursor = 0;
  const matches = [...value.matchAll(markdownLink)];

  for (const match of matches) {
    const start = match.index ?? 0;
    if (start < cursor) continue;
    html += escapeHtml(value.slice(cursor, start)).replaceAll("\n", "<br />");
    html += `<a href="${escapeHtml(match[2])}" target="_blank" rel="noopener noreferrer">${escapeHtml(match[1])}</a>`;
    cursor = start + match[0].length;
  }

  html += escapeHtml(value.slice(cursor)).replace(url, (match) => {
    const safeUrl = match.replace(/[),.;]+$/, "");
    const suffix = match.slice(safeUrl.length);
    return `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(safeUrl)}</a>${escapeHtml(suffix)}`;
  }).replaceAll("\n", "<br />");

  return html;
}

export function styleCss(question: {
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
}) {
  const fontSize = Math.min(32, Math.max(8, question.fontSize || 11));
  return `font-size:${fontSize}pt;font-weight:${question.isBold ? "700" : "400"};font-style:${question.isItalic ? "italic" : "normal"};`;
}

export async function loadSubmission(id: string) {
  return prisma.submission.findUnique({
    where: { id },
    include: {
      template: { include: { questions: { orderBy: { order: "asc" } } } },
      submittedBy: { select: { id: true, name: true, email: true } },
      answers: { include: { question: true } },
    },
  });
}

function orderedPdfAnswers(submission: NonNullable<PdfSubmissionRecord>): QuestionAnswer[] {
  const order = new Map(
    submission.template.questions.map((question) => [question.id, question.order])
  );
  return [...submission.answers]
    .sort((a, b) => (order.get(a.questionId) ?? 0) - (order.get(b.questionId) ?? 0))
    .map((answer) => ({
      order: answer.question.order,
      label: answer.question.label,
      type: answer.question.type,
      isRepeatable: answer.question.isRepeatable,
      value: answer.value,
      fontSize: answer.question.fontSize,
      isBold: answer.question.isBold,
      isItalic: answer.question.isItalic,
    }));
}

export function buildPdfAnswers(
  questions: TemplateQuestion[],
  answers: SubmissionAnswerInput[]
): QuestionAnswer[] {
  const byId = new Map(questions.map((question) => [question.id, question]));
  const result: QuestionAnswer[] = [];
  for (const answer of answers) {
    const question = byId.get(answer.questionId);
    if (!question) continue;
    result.push({
      order: question.order,
      label: question.label,
      type: question.type as QuestionAnswer["type"],
      isRepeatable: question.isRepeatable,
      value: answer.value,
      fontSize: question.fontSize,
      isBold: question.isBold,
      isItalic: question.isItalic,
    });
  }
  return result.sort((a, b) => a.order - b.order);
}

export async function generateSubmissionPdf(submission: NonNullable<PdfSubmissionRecord>) {
  return generateReportPdf({
    templateTitle: submission.template.title,
    templateDescription: submission.template.description,
    submittedByName: submission.submittedByName,
    reportMonth: submission.reportMonth,
    submittedByEmail: submission.submittedBy.email,
    submittedAt: submission.createdAt.toISOString(),
    ipAddress: submission.ipAddress,
    answers: orderedPdfAnswers(submission),
    signatureBase64: submission.signatureBase64,
  });
}

export function submissionFileName(submission: NonNullable<PdfSubmissionRecord>) {
  const safeTitle = submission.template.title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `relatorio-${safeTitle || "sem-titulo"}-${submission.id}.pdf`;
}

export async function getReportRecipients(email: string) {
  const superUsers = await prisma.user.findMany({
    where: { role: "SUPER_USER", status: "APPROVED" },
    select: { email: true },
  });
  return Array.from(new Set([email, ...superUsers.map((user) => user.email)].filter(Boolean)));
}

export async function deliverSubmission(id: string) {
  const submission = await loadSubmission(id);
  if (!submission) throw new Error("Relatório não encontrado.");

  await prisma.submission.update({
    where: { id },
    data: {
      deliveryStatus: "PENDING",
      deliveryAttempts: { increment: 1 },
      lastDeliveryAttemptAt: new Date(),
      lastDeliveryError: null,
    },
  });

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await generateSubmissionPdf(submission);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao gerar o PDF.";
    await prisma.submission.update({
      where: { id },
      data: { deliveryStatus: "FAILED", lastDeliveryError: message },
    });
    throw new Error(message);
  }

  try {
    await sendReportEmail({
      to: await getReportRecipients(submission.submittedBy.email),
      subject: `Relatório enviado: ${submission.template.title}`,
      html: `<p>Olá,</p><p>O relatório <strong>${escapeHtml(submission.template.title)}</strong> foi preenchido por <strong>${escapeHtml(submission.submittedByName)}</strong>.</p><p>O PDF completo está anexado a este e-mail.</p>`,
      pdfBuffer,
      pdfFileName: submissionFileName(submission),
    });

    await prisma.submission.update({
      where: { id },
      data: {
        deliveryStatus: "SENT",
        deliveredAt: new Date(),
        lastDeliveryError: null,
      },
    });

    return { pdfBuffer, emailSent: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao enviar o PDF por e-mail.";
    await prisma.submission.update({
      where: { id },
      data: { deliveryStatus: "FAILED", lastDeliveryError: message },
    });
    return { pdfBuffer, emailSent: false, error: message };
  }
}

export async function createPdfPreview(data: {
  templateTitle: string;
  templateDescription?: string | null;
  submittedByName: string;
  reportMonth?: string | null;
  submittedByEmail: string;
  submittedAt: string;
  ipAddress?: string | null;
  answers: QuestionAnswer[];
  signatureBase64: string;
}) {
  return generateReportPdf(data);
}
