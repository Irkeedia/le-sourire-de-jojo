/**
 * Génération de vrais fichiers .docx (Word / LibreOffice / Google Docs).
 *
 * Le navigateur envoie le document tel qu'il est affiché à l'écran, réduit à une
 * structure simple (titres, paragraphes, styles, signatures). On reconstruit ici
 * un document Word natif : le contenu reste modifiable par l'avocat ou la CCI.
 */
import {
  AlignmentType,
  Document,
  Footer,
  HeadingLevel,
  ImageRun,
  PageNumber,
  Packer,
  Paragraph,
  TextRun,
  convertMillimetersToTwip,
} from "docx";
import { z } from "zod";

/** Styles reconnus, calqués sur la mise en forme des documents du site. */
export const DOCX_STYLES = [
  "entity",
  "subtitle",
  "title",
  "heading",
  "body",
  "small",
  "label",
  "footer",
  "bullet",
] as const;

const runSchema = z.object({
  t: z.string().max(4000),
  b: z.boolean().optional(),
  i: z.boolean().optional(),
});

const blockSchema = z.union([
  z.object({
    type: z.literal("text"),
    style: z.enum(DOCX_STYLES),
    runs: z.array(runSchema).max(300),
  }),
  z.object({
    type: z.literal("image"),
    /** PNG encodé en base64 (sans le préfixe data:). */
    data: z.string().max(600_000),
    w: z.number().int().min(1).max(2000),
    h: z.number().int().min(1).max(2000),
  }),
]);

export const docxPayloadSchema = z.object({
  title: z.string().min(1).max(200),
  filename: z.string().min(1).max(80),
  blocks: z.array(blockSchema).min(1).max(1000),
});

export type DocxPayload = z.infer<typeof docxPayloadSchema>;
type DocxBlock = z.infer<typeof blockSchema>;

const MARINE = "1D3557";
const GREY = "555555";

/** Points Word (demi-points pour `size`) et espacements par style. */
function paragraphOptions(style: (typeof DOCX_STYLES)[number]) {
  switch (style) {
    case "entity":
      return {
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        run: { size: 26, bold: true, color: MARINE },
      };
    case "subtitle":
      return {
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        run: { size: 20, color: GREY },
      };
    case "title":
      return {
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 200 },
        heading: HeadingLevel.TITLE,
        run: { size: 36, bold: true, color: MARINE },
      };
    case "heading":
      return {
        spacing: { before: 320, after: 120 },
        heading: HeadingLevel.HEADING_2,
        run: { size: 26, bold: true, color: MARINE },
      };
    case "small":
      return {
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        run: { size: 18, italics: true, color: GREY },
      };
    case "label":
      return {
        spacing: { before: 160, after: 80 },
        run: { size: 22, bold: true, color: MARINE },
      };
    case "footer":
      return {
        alignment: AlignmentType.CENTER,
        spacing: { before: 320 },
        run: { size: 16, color: GREY },
      };
    case "bullet":
      return {
        spacing: { after: 80 },
        bullet: { level: 0 },
        run: { size: 22 },
      };
    case "body":
    default:
      return {
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 140, line: 288 },
        run: { size: 22 },
      };
  }
}

/** Largeur utile d'une page A4 avec marges de 20 mm, en points Word. */
const MAX_IMAGE_WIDTH_PT = 240;

function buildParagraph(block: DocxBlock): Paragraph | null {
  if (block.type === "image") {
    let width = block.w;
    let height = block.h;
    if (width > MAX_IMAGE_WIDTH_PT) {
      height = Math.max(1, Math.round((height * MAX_IMAGE_WIDTH_PT) / width));
      width = MAX_IMAGE_WIDTH_PT;
    }
    let data: Buffer;
    try {
      data = Buffer.from(block.data, "base64");
    } catch {
      return null;
    }
    if (data.length === 0) return null;
    return new Paragraph({
      spacing: { before: 80, after: 80 },
      children: [
        new ImageRun({
          type: "png",
          data,
          transformation: { width, height },
        }),
      ],
    });
  }

  const { run, ...options } = paragraphOptions(block.style);
  const children = block.runs
    .filter((r) => r.t.length > 0)
    .map(
      (r) =>
        new TextRun({
          ...run,
          text: r.t,
          bold: r.b ? true : run.bold,
          italics: r.i ? true : run.italics,
        }),
    );

  // Un paragraphe vide sert d'espacement : on le garde s'il porte un style de titre.
  if (children.length === 0 && block.style === "body") return null;

  return new Paragraph({ ...options, children });
}

export async function buildDocx(payload: DocxPayload): Promise<Buffer> {
  const children = payload.blocks
    .map(buildParagraph)
    .filter((p): p is Paragraph => p !== null);

  const doc = new Document({
    creator: "Le Sourire de Jojo",
    title: payload.title,
    description: "Document généré depuis le site lesouriredejojo",
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22, color: "1A1A1A" },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: convertMillimetersToTwip(210),
              height: convertMillimetersToTwip(297),
            },
            margin: {
              top: convertMillimetersToTwip(20),
              right: convertMillimetersToTwip(20),
              bottom: convertMillimetersToTwip(20),
              left: convertMillimetersToTwip(20),
            },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    children: [
                      "Le Sourire de Jojo — page ",
                      PageNumber.CURRENT,
                      " / ",
                      PageNumber.TOTAL_PAGES,
                    ],
                    size: 16,
                    color: GREY,
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}

/** Nom de fichier sûr pour l'en-tête Content-Disposition. */
export function safeFilename(raw: string): string {
  const cleaned = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 _-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 70);
  return cleaned.length > 0 ? cleaned : "document";
}
