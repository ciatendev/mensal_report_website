# Sistema de Relatórios CIATEN

Gerenciamento e preenchimento de relatórios/formulários, com
assinatura digital, geração de PDF (A4) e envio automático por e-mail.

## Stack

- Next.js 14 (App Router, TypeScript, Tailwind)
- MySQL + Prisma ORM
- Auth.js com Google OAuth 
- React-signature-canvas (desenho) + upload de imagem
- Puppeteer + Handlebars (geração de PDF)
- Nodemailer