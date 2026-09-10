import puppeteer, { Browser } from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import Handlebars from "handlebars";
import fs from "node:fs/promises";
import path from "node:path";
import { renderRichText, styleCss } from "@/lib/pdf-format";

let browserSingleton: Browser | null = null;
let logoBase64Cache: string | null = null;

async function getLogoBase64(): Promise<string> {
  if (logoBase64Cache) return logoBase64Cache;
  const logoPath = path.join(process.cwd(), "src/lib/pdf-templates/assets/ciaten-logo.png");
  const buffer = await fs.readFile(logoPath);
  logoBase64Cache = `data:image/png;base64,${buffer.toString("base64")}`;
  return logoBase64Cache;
}

async function getBrowser(): Promise<Browser> {
  if (browserSingleton && browserSingleton.connected) return browserSingleton;

  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    chromium.setGraphicsMode = false;

    // Baixa/extrai a versão compatível com a release do Sparticuz
    const packUrl = "https://github.com/Sparticuz/chromium/releases/download/v123.0.1/chromium-v123.0.1-pack.tar";
    const executablePath = await chromium.executablePath(packUrl);

    browserSingleton = await puppeteer.launch({
      args: [
        ...chromium.args,
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--single-process", // Importante para evitar crash por falta de memória na Vercel
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    });
  } else {
    const configuredExecutable = process.env.PUPPETEER_EXECUTABLE_PATH;
    const systemExecutable = "/usr/bin/chromium";
    let executablePath = configuredExecutable;

    if (!executablePath) {
      try {
        await fs.access(systemExecutable);
        executablePath = systemExecutable;
      } catch {
        executablePath = undefined;
      }
    }

    browserSingleton = await puppeteer.launch({
      headless: true,
      ...(executablePath ? { executablePath } : {}),
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }

  return browserSingleton;
}

Handlebars.registerHelper("formatDate", (date: string | Date) => {
  const parsed = new Date(date);
  return parsed.toLocaleDateString("pt-BR");
});

export type QuestionType =
  | "TEXT"
  | "TEXTAREA"
  | "NUMBER"
  | "DATE"
  | "SELECT"
  | "CHECKBOX"
  | "YES_NO_JUSTIFY";

export interface QuestionAnswer {
  order: number;
  label: string;
  type: QuestionType;
  isRepeatable: boolean;
  value: string;
  fontSize?: number | null;
  isBold?: boolean;
  isItalic?: boolean;
}

export interface ReportData {
  templateTitle: string;
  templateDescription?: string | null;
  submittedByName: string;
  reportMonth?: string | null;
  nucleusName?: string | null;
  submittedByEmail: string;
  submittedAt: string;
  ipAddress?: string | null;
  answers: QuestionAnswer[];
  signatureBase64: string;
}

function parseYesNoValue(value: string) {
  try {
    const parsed = JSON.parse(value || "{}");
    return {
      description: String(parsed.description ?? ""),
      status: parsed.status === "SIM" || parsed.status === "NAO" ? parsed.status : "",
      justification: String(parsed.justification ?? ""),
      details: String(parsed.details ?? ""),
      links: Array.isArray(parsed.links) ? parsed.links : [],
    };
  } catch {
    return { description: value, status: "", justification: "", details: "", links: [] };
  }
}

function isActivityAnswer(answer: QuestionAnswer) {
  return answer.type === "YES_NO_JUSTIFY";
}

function isFreeTextSectionAnswer(answer: QuestionAnswer) {
  if (answer.type === "TEXTAREA" || answer.isRepeatable) return true;
  const normalizedLabel = answer.label
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return (
    normalizedLabel.includes("adicionar atividades") ||
    normalizedLabel.includes("atividades eventualmente executadas") ||
    normalizedLabel.includes("planejadas para o proximo mes") ||
    normalizedLabel.includes("planejamento do proximo mes")
  );
}

type PdfSection =
  | {
      kind: "activity";
      isActivity: true;
      order: number;
      title: string;
      rows: {
        descriptionHtml: string;
        detailsAndJustificationHtml: string;
        isSim: boolean;
        isNao: boolean;
        styleCss: string;
      }[];
    }
  | {
      kind: "text";
      isActivity: false;
      order: number;
      label: string;
      items: { html: string; styleCss: string }[];
    };

function formatReportMonth(reportMonth?: string | null) {
  if (!reportMonth || !/^\d{4}-(0[1-9]|1[0-2])$/.test(reportMonth)) return "";
  const [year, month] = reportMonth.split("-");
  return `${month}/${year}`;
}

function groupAnswersForTemplate(answers: QuestionAnswer[]) {
  const orderedAnswers = [...answers].sort((a, b) => a.order - b.order);
  const nucleusAnswer = orderedAnswers.find((answer) => answer.type === "SELECT");
  const nucleusName = nucleusAnswer?.value ?? "";
  const headerFields = orderedAnswers
    .filter(
      (answer) =>
        answer !== nucleusAnswer &&
        !isActivityAnswer(answer) && !isFreeTextSectionAnswer(answer)
    )
    .map((answer) => ({
      label: answer.label,
      valueHtml: renderRichText(answer.value),
      styleCss: styleCss(answer),
    }));

  const groups = new Map<string, QuestionAnswer[]>();
  for (const answer of orderedAnswers) {
    if (!isActivityAnswer(answer) && !isFreeTextSectionAnswer(answer)) {
      continue;
    }
    if (!groups.has(answer.label)) groups.set(answer.label, []);
    groups.get(answer.label)!.push(answer);
  }

  const sections: PdfSection[] = [];
  for (const [label, group] of groups) {
    const first = group[0];
    const sectionOrder = first.order;
    if (isActivityAnswer(first)) {
      sections.push({
        kind: "activity",
        isActivity: true,
        order: sectionOrder,
        title: label,
        rows: group.map((answer) => {
          const parsed = parseYesNoValue(answer.value);
          const details = [
            parsed.details,
            ...parsed.links.map((link: { text?: string; url?: string }) =>
              link.text && link.url ? `[${link.text}](${link.url})` : ""
            ),
          ]
            .filter(Boolean)
            .join("\n");
          const detailsAndJustification = [details, parsed.justification]
            .filter(Boolean)
            .join("\n");
          return {
            descriptionHtml: renderRichText(parsed.description),
            detailsAndJustificationHtml: renderRichText(detailsAndJustification),
            isSim: parsed.status === "SIM",
            isNao: parsed.status === "NAO",
            styleCss: styleCss(answer),
          };
        }),
      });
    } else {
      sections.push({
        kind: "text",
        isActivity: false,
        order: sectionOrder,
        label,
        items: group.map((answer) => ({
          html: renderRichText(answer.value),
          styleCss: styleCss(answer),
        })),
      });
    }
  }

  const orderedSections = sections
    .sort((a, b) => a.order - b.order)
    .map((section, index) => ({ ...section, order: index + 2 }));

  return { headerFields, nucleusName, sections: orderedSections };
}

export async function generateReportPdf(data: ReportData): Promise<Buffer> {
  const templatePath = path.join(process.cwd(), "src/lib/pdf-templates/report-layout.hbs");
  const templateSource = await fs.readFile(templatePath, "utf-8");
  const compiledTemplate = Handlebars.compile(templateSource);
  const html = compiledTemplate({
    ...data,
    reportMonth: formatReportMonth(data.reportMonth),
    logoBase64: await getLogoBase64(),
    ...groupAnswersForTemplate(data.answers),
  });

  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "15mm", bottom: "15mm", left: "15mm", right: "15mm" },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
  }
}