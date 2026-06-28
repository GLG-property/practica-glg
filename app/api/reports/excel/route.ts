import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getSession } from "@/lib/auth/session";
import { getReportData, STATUS_LABEL_RO, PAYMENT_LABEL_RO } from "@/lib/reports/data";

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

  const wb = new ExcelJS.Workbook();
  wb.creator = "GLG Property";

  // Foaie: Lecții
  const ws = wb.addWorksheet("Lecții");
  ws.columns = [
    { header: "Data", key: "date", width: 14 },
    { header: "Ora", key: "time", width: 10 },
    { header: "Instructor", key: "instructor", width: 26 },
    { header: "Cursant", key: "student", width: 26 },
    { header: "Mașină", key: "car", width: 24 },
    { header: "Faza", key: "phase", width: 8 },
    { header: "Status", key: "status", width: 20 },
    { header: "Plată", key: "payment", width: 22 },
  ];
  ws.getRow(1).font = { bold: true };
  for (const r of data.rows) {
    ws.addRow({ ...r, status: STATUS_LABEL_RO[r.status], payment: PAYMENT_LABEL_RO[r.payment] });
  }

  // Foaie: Sumar
  const sum = wb.addWorksheet("Sumar");
  sum.columns = [
    { header: "Indicator", key: "k", width: 28 },
    { header: "Valoare", key: "v", width: 16 },
  ];
  sum.getRow(1).font = { bold: true };
  sum.addRows([
    { k: "Interval", v: `${data.range.from} → ${data.range.to}` },
    { k: "Total lecții", v: data.summary.total },
    { k: "Efectuate", v: data.summary.completed },
    { k: "Neprezentări", v: data.summary.no_show },
    { k: "Anulate", v: data.summary.cancelled },
    { k: "Programate", v: data.summary.scheduled },
    { k: "Rată neprezentare (%)", v: data.summary.noShowRate },
    { k: "Lecții neachitate", v: data.summary.unpaid },
    { k: "Achitate la instructor (cash)", v: data.summary.cashByInstructor },
  ]);

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `raport-glg-${data.range.from}_${data.range.to}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
