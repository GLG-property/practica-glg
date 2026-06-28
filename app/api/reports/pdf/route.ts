import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { getSession } from "@/lib/auth/session";
import { getReportData, STATUS_LABEL_RO } from "@/lib/reports/data";
import { latinize } from "@/lib/reports/sanitize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const data = await getReportData({
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
    instructorId: sp.get("instructor") ?? undefined,
  });

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const pageW = 595.28; // A4
  const pageH = 841.89;
  const margin = 40;
  let page = doc.addPage([pageW, pageH]);
  let y = pageH - margin;

  const draw = (
    text: string,
    x: number,
    yy: number,
    size = 10,
    f: PDFFont = font,
    color = rgb(0.1, 0.1, 0.1)
  ) => {
    page.drawText(latinize(text), { x, y: yy, size, font: f, color });
  };

  // Titlu
  draw("GLG Property — Raport lecții", margin, y, 18, bold, rgb(0.11, 0.31, 0.85));
  y -= 24;
  draw(`Interval: ${data.range.from} -> ${data.range.to}`, margin, y, 11);
  y -= 28;

  // Sumar
  draw("Sumar", margin, y, 13, bold);
  y -= 18;
  const summaryLine = `Total: ${data.summary.total}   Efectuate: ${data.summary.completed}   Neprezentari: ${data.summary.no_show}   Anulate: ${data.summary.cancelled}   Neachitate: ${data.summary.unpaid}   Cash instructor: ${data.summary.cashByInstructor}`;
  draw(summaryLine, margin, y, 10);
  y -= 26;

  // Tabel
  const cols = [
    { label: "Data", x: margin, w: 60 },
    { label: "Ora", x: margin + 60, w: 40 },
    { label: "Instructor", x: margin + 100, w: 120 },
    { label: "Cursant", x: margin + 220, w: 120 },
    { label: "Masina", x: margin + 340, w: 110 },
    { label: "Status", x: margin + 450, w: 90 },
  ];

  const header = () => {
    for (const c of cols) draw(c.label, c.x, y, 10, bold);
    y -= 4;
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageW - margin, y },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });
    y -= 14;
  };

  const newPage = () => {
    page = doc.addPage([pageW, pageH]);
    y = pageH - margin;
  };

  header();

  for (const r of data.rows) {
    if (y < margin + 30) {
      newPage();
      header();
    }
    draw(r.date, cols[0].x, y, 9);
    draw(r.time, cols[1].x, y, 9);
    draw(truncate(r.instructor, 22), cols[2].x, y, 9);
    draw(truncate(r.student, 22), cols[3].x, y, 9);
    draw(truncate(r.car, 20), cols[4].x, y, 9);
    draw(STATUS_LABEL_RO[r.status], cols[5].x, y, 9);
    y -= 14;
  }

  if (data.rows.length === 0) {
    draw("Nu exista lectii in acest interval.", margin, y, 10);
  }

  const bytes = await doc.save();
  const filename = `raport-glg-${data.range.from}_${data.range.to}.pdf`;

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "..." : s;
}
