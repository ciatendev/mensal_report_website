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
