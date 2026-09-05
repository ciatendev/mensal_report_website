import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: Number(process.env.SMTP_PORT) === 465, // true para porta 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

interface SendReportEmailParams {
  to: string[];
  subject: string;
  html: string;
  pdfBuffer: Buffer;
  pdfFileName: string;
}

/**
 * Envia o e-mail com o PDF do relatório em anexo.
 * Usado tanto para notificar o autor da submissão quanto os SUPER_USERs.
 */
export async function sendReportEmail({
  to,
  subject,
  html,
  pdfBuffer,
  pdfFileName,
}: SendReportEmailParams) {
  return transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject,
    html,
    attachments: [
      {
        filename: pdfFileName,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}

interface SendAccessRequestEmailParams {
  to: string[];
  requesterName: string;
  requesterEmail: string;
}

/**
 * Notifica os SUPER_USERs quando alguém novo faz login pela primeira vez
 * (fica com status PENDING) pedindo acesso ao sistema. Inclui um link
 * direto para a tela de aprovação (/admin/whitelist).
 */
export async function sendAccessRequestEmail({
  to,
  requesterName,
  requesterEmail,
}: SendAccessRequestEmailParams) {
  if (to.length === 0) return; // nenhum super usuário cadastrado ainda

  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const whitelistUrl = `${appUrl}/admin/whitelist`;

  return transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: `Novo pedido de acesso: ${requesterName}`,
    html: `
      <p>Olá,</p>
      <p><strong>${requesterName}</strong> (${requesterEmail}) acabou de fazer
      login no ${process.env.APP_NAME ?? "Sistema de Relatórios"} e está
      aguardando aprovação para preencher relatórios.</p>
      <p>
        <a href="${whitelistUrl}"
           style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;
                  padding:10px 18px;border-radius:6px;font-weight:600;">
          Analisar solicitação
        </a>
      </p>
      <p style="color:#666;font-size:13px;">
        Se o botão não funcionar, acesse: ${whitelistUrl}
      </p>
    `,
  });
}

/**
 * ---------------------------------------------------------------
 * Alternativa usando Resend (descomente e ajuste se preferir Resend
 * em vez de SMTP/Nodemailer). Basta trocar a implementação acima
 * mantendo a mesma assinatura de função `sendReportEmail`.
 * ---------------------------------------------------------------
 *
 * import { Resend } from "resend";
 * const resend = new Resend(process.env.RESEND_API_KEY);
 *
 * export async function sendReportEmail({ to, subject, html, pdfBuffer, pdfFileName }: SendReportEmailParams) {
 *   return resend.emails.send({
 *     from: process.env.MAIL_FROM!,
 *     to,
 *     subject,
 *     html,
 *     attachments: [{ filename: pdfFileName, content: pdfBuffer }],
 *   });
 * }
 */

// ─── Emails de Registro de Atividades ────────────────────────────────────────

interface ActivitySubmittedParams {
  to: string[];               // emails dos SUPER_USERs
  authorName: string;
  authorEmail: string;
  recordNome: string;
  recordIndicador: string;
  recordEquipe: string;
  validacaoUrl: string;
}

/**
 * Notifica os SUPER_USERs quando alguém submete um novo registro de atividade.
 */
export async function sendActivitySubmittedEmail({
  to, authorName, authorEmail, recordNome, recordIndicador, recordEquipe, validacaoUrl,
}: ActivitySubmittedParams) {
  if (!to.length) return;

  const appName = process.env.APP_NAME ?? "CIATEN — Sistema de Registro de Resultados";

  return transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: `Novo registro aguardando validação: ${recordNome}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1C2B3A">
        <div style="background:#1A4F7A;padding:20px 24px;border-radius:8px 8px 0 0">
          <h1 style="margin:0;font-size:20px;color:#fff">${appName}</h1>
        </div>
        <div style="background:#fff;padding:24px;border:1px solid #D6E2EE;border-top:none;border-radius:0 0 8px 8px">
          <p style="margin:0 0 16px">Olá,</p>
          <p style="margin:0 0 16px">
            <strong>${authorName}</strong> (${authorEmail}) enviou um novo registro de atividade que aguarda sua validação:
          </p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
            <tr><td style="padding:8px 12px;background:#F5F7FA;font-weight:600;width:140px;border:1px solid #D6E2EE">Atividade</td><td style="padding:8px 12px;border:1px solid #D6E2EE">${recordNome}</td></tr>
            <tr><td style="padding:8px 12px;background:#F5F7FA;font-weight:600;border:1px solid #D6E2EE">Indicador</td><td style="padding:8px 12px;border:1px solid #D6E2EE">${recordIndicador}</td></tr>
            <tr><td style="padding:8px 12px;background:#F5F7FA;font-weight:600;border:1px solid #D6E2EE">Equipe</td><td style="padding:8px 12px;border:1px solid #D6E2EE">${recordEquipe}</td></tr>
          </table>
          <a href="${validacaoUrl}"
             style="display:inline-block;background:#1A4F7A;color:#fff;text-decoration:none;
                    padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px">
            Analisar registro
          </a>
          <p style="margin:20px 0 0;font-size:12px;color:#5A7184">
            Se o botão não funcionar, acesse: <a href="${validacaoUrl}" style="color:#1A4F7A">${validacaoUrl}</a>
          </p>
        </div>
      </div>
    `,
  });
}

interface ActivityValidatedParams {
  to: string;                 // email do autor
  authorName: string;
  recordNome: string;
  recordIndicador: string;
  newStatus: "APPROVED" | "REJECTED" | "ADJUSTMENT_NEEDED";
  notaValidacao?: string | null;
  validadorName: string;
  registrosUrl: string;
}

const STATUS_LABEL_PT: Record<string, { label: string; color: string; emoji: string }> = {
  APPROVED:          { label: "Aprovado",          color: "#1B7F5A", emoji: "✅" },
  REJECTED:          { label: "Não contabilizado", color: "#A13B3B", emoji: "❌" },
  ADJUSTMENT_NEEDED: { label: "Ajuste solicitado", color: "#E85D1F", emoji: "⚠️" },
};

/**
 * Notifica o autor do registro sobre o resultado da validação.
 */
export async function sendActivityValidatedEmail({
  to, authorName, recordNome, recordIndicador,
  newStatus, notaValidacao, validadorName, registrosUrl,
}: ActivityValidatedParams) {
  const s = STATUS_LABEL_PT[newStatus] ?? { label: newStatus, color: "#1A4F7A", emoji: "ℹ️" };
  const appName = process.env.APP_NAME ?? "CIATEN — Sistema de Registro de Resultados";

  return transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: `${s.emoji} Seu registro foi analisado: ${recordNome}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1C2B3A">
        <div style="background:#1A4F7A;padding:20px 24px;border-radius:8px 8px 0 0">
          <h1 style="margin:0;font-size:20px;color:#fff">${appName}</h1>
        </div>
        <div style="background:#fff;padding:24px;border:1px solid #D6E2EE;border-top:none;border-radius:0 0 8px 8px">
          <p style="margin:0 0 16px">Olá, <strong>${authorName}</strong>!</p>
          <p style="margin:0 0 20px">
            Seu registro foi analisado pela coordenação.
            Resultado: <strong style="color:${s.color}">${s.emoji} ${s.label}</strong>
          </p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
            <tr><td style="padding:8px 12px;background:#F5F7FA;font-weight:600;width:140px;border:1px solid #D6E2EE">Atividade</td><td style="padding:8px 12px;border:1px solid #D6E2EE">${recordNome}</td></tr>
            <tr><td style="padding:8px 12px;background:#F5F7FA;font-weight:600;border:1px solid #D6E2EE">Indicador</td><td style="padding:8px 12px;border:1px solid #D6E2EE">${recordIndicador}</td></tr>
            <tr><td style="padding:8px 12px;background:#F5F7FA;font-weight:600;border:1px solid #D6E2EE">Analisado por</td><td style="padding:8px 12px;border:1px solid #D6E2EE">${validadorName}</td></tr>
            ${notaValidacao ? `<tr><td style="padding:8px 12px;background:#FFF8E7;font-weight:600;border:1px solid #D6E2EE">Orientação</td><td style="padding:8px 12px;background:#FFF8E7;border:1px solid #D6E2EE">${notaValidacao}</td></tr>` : ""}
          </table>
          ${newStatus === "ADJUSTMENT_NEEDED" ? `
          <p style="margin:0 0 16px;font-size:14px;color:#5A7184">
            Acesse o sistema, corrija o registro conforme orientação da coordenação e reenvie para validação.
          </p>` : ""}
          <a href="${registrosUrl}"
             style="display:inline-block;background:#1A4F7A;color:#fff;text-decoration:none;
                    padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px">
            Ver meus registros
          </a>
          <p style="margin:20px 0 0;font-size:12px;color:#5A7184">
            Se o botão não funcionar, acesse: <a href="${registrosUrl}" style="color:#1A4F7A">${registrosUrl}</a>
          </p>
        </div>
      </div>
    `,
  });
}
