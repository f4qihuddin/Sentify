import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const projectRoot = path.resolve(import.meta.dirname, "..", "..");
const csvPath = path.join(projectRoot, "src", "data", "review_ecommerce_dummy.csv");
const outputDir = path.join(projectRoot, "outputs", "ecommerce_review_dummy");
const xlsxPath = path.join(outputDir, "review_ecommerce_dummy.xlsx");
const previewPath = path.join(outputDir, "review_ecommerce_dummy_preview.png");

const years = [2022, 2023, 2024, 2025, 2026];

const positiveSubjects = [
  "Proses checkout",
  "Pencarian produknya",
  "Metode pembayarannya",
  "Fitur pelacakan paket",
  "Tampilan aplikasinya",
  "Promo gratis ongkirnya",
  "Layanan pelanggan",
  "Notifikasi pesanan",
  "Pilihan tokonya",
  "Program loyalitasnya",
  "Fitur ulasan produk",
  "Proses pengembalian dana",
];

const positiveDetails = [
  "mudah dipahami dan tidak membingungkan",
  "cepat digunakan walaupun koneksi sedang kurang stabil",
  "memberikan informasi yang jelas dan lengkap",
  "sangat membantu saat saya berbelanja kebutuhan harian",
  "berjalan lancar tanpa kendala berarti",
  "membuat pengalaman belanja terasa lebih praktis",
  "responsif dan hasilnya sesuai dengan yang saya butuhkan",
  "memudahkan saya membandingkan beberapa pilihan produk",
  "terasa lebih rapi setelah pembaruan terakhir",
  "cukup akurat dan mudah diakses dari halaman utama",
];

const positiveEndings = [
  "Pesanan juga sampai sesuai estimasi.",
  "Saya puas dan akan memakai aplikasi ini lagi.",
  "Secara keseluruhan pengalaman belanjanya menyenangkan.",
  "Penjual merespons dengan cepat dan ramah.",
  "Barang yang diterima sesuai foto dan deskripsi.",
  "Transaksinya aman dari awal sampai selesai.",
  "Aplikasi ini sangat membantu menghemat waktu.",
  "Semoga kualitas layanan seperti ini terus dipertahankan.",
  "Harga yang ditampilkan juga transparan.",
  "Saya mudah menemukan produk yang sedang dicari.",
];

const negativeSubjects = [
  "Proses checkout",
  "Pencarian produknya",
  "Metode pembayarannya",
  "Fitur pelacakan paket",
  "Tampilan aplikasinya",
  "Voucher gratis ongkir",
  "Layanan pelanggan",
  "Notifikasi pesanan",
  "Proses pengembalian dana",
  "Halaman detail produk",
  "Fitur chat dengan penjual",
  "Pembaruan aplikasinya",
];

const negativeDetails = [
  "sering lambat dan tiba-tiba berhenti",
  "membingungkan karena informasi penting sulit ditemukan",
  "beberapa kali gagal tanpa penjelasan yang jelas",
  "tidak menampilkan status terbaru dengan benar",
  "terasa berat setelah pembaruan terakhir",
  "sering mengalami error ketika paling dibutuhkan",
  "tidak responsif dan membuat proses belanja terhambat",
  "menampilkan terlalu banyak iklan dan notifikasi",
  "tidak konsisten antara halaman keranjang dan pembayaran",
  "membutuhkan waktu terlalu lama untuk memuat data",
];

const negativeEndings = [
  "Pesanan saya juga datang melewati estimasi.",
  "Masalah ini membuat saya ragu untuk berbelanja lagi.",
  "Customer service belum memberikan solusi yang membantu.",
  "Saya harus mengulangi transaksi beberapa kali.",
  "Informasi yang tampil berbeda dengan kondisi sebenarnya.",
  "Mohon segera diperbaiki pada pembaruan berikutnya.",
  "Pengalaman belanja kali ini sangat mengecewakan.",
  "Dana pengembalian belum masuk sesuai waktu yang dijanjikan.",
  "Aplikasi bahkan tertutup sendiri saat digunakan.",
  "Saya kesulitan mendapatkan bantuan ketika terjadi kendala.",
];

function buildReview(label, index, year) {
  const subjects = label === "positive" ? positiveSubjects : negativeSubjects;
  const details = label === "positive" ? positiveDetails : negativeDetails;
  const endings = label === "positive" ? positiveEndings : negativeEndings;
  const subject = subjects[index % subjects.length];
  const detail = details[(index * 3 + year) % details.length];
  const ending = endings[(index * 7 + year) % endings.length];

  return `${subject} ${detail}. ${ending}`;
}

const rows = [];

for (const year of years) {
  for (let index = 0; index < 120; index += 1) {
    // 66 positive dan 54 negative per tahun.
    const label = index % 20 < 11 ? "positive" : "negative";
    rows.push([year, buildReview(label, index, year), label]);
  }
}

function escapeCsv(value) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const csvText = [
  ["tahun", "review", "label"],
  ...rows,
]
  .map((row) => row.map(escapeCsv).join(","))
  .join("\r\n");

await fs.mkdir(path.dirname(csvPath), { recursive: true });
await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(csvPath, `${csvText}\r\n`, "utf8");

const workbook = Workbook.create();
const sheet = workbook.worksheets.add("Review Dummy");
sheet.getRange(`A1:C${rows.length + 1}`).values = [
  ["tahun", "review", "label"],
  ...rows,
];

const header = sheet.getRange("A1:C1");
header.format = {
  fill: "#474973",
  font: { bold: true, color: "#FFFFFF" },
  rowHeight: 25,
};

sheet.getRange(`A2:A${rows.length + 1}`).format.numberFormat = "0";
sheet.getRange(`A1:A${rows.length + 1}`).format.columnWidth = 12;
sheet.getRange(`B1:B${rows.length + 1}`).format.columnWidth = 85;
sheet.getRange(`B2:B${rows.length + 1}`).format.wrapText = true;
sheet.getRange(`C1:C${rows.length + 1}`).format.columnWidth = 16;
sheet.getRange(`C2:C${rows.length + 1}`).dataValidation = {
  rule: { type: "list", values: ["positive", "negative"] },
};

sheet.getRange(`C2:C${rows.length + 1}`).conditionalFormats.add(
  "containsText",
  {
    text: "positive",
    format: { fill: "#DCFCE7", font: { color: "#166534" } },
  },
);
sheet.getRange(`C2:C${rows.length + 1}`).conditionalFormats.add(
  "containsText",
  {
    text: "negative",
    format: { fill: "#FEE2E2", font: { color: "#991B1B" } },
  },
);

sheet.tables.add(`A1:C${rows.length + 1}`, true, "ReviewDummyTable");
sheet.freezePanes.freezeRows(1);
sheet.showGridLines = false;

const inspection = await workbook.inspect({
  kind: "table",
  range: "Review Dummy!A1:C8",
  include: "values,formulas",
  tableMaxRows: 8,
  tableMaxCols: 3,
});

const errorScan = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 50 },
  summary: "final formula error scan",
});

const preview = await workbook.render({
  sheetName: "Review Dummy",
  range: "A1:C18",
  scale: 1,
  format: "png",
});
await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));

const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(xlsxPath);

const counts = rows.reduce(
  (result, [year, , label]) => {
    result.total += 1;
    result.labels[label] += 1;
    result.years[year] = (result.years[year] ?? 0) + 1;
    return result;
  },
  { total: 0, labels: { positive: 0, negative: 0 }, years: {} },
);

console.log(JSON.stringify({ csvPath, xlsxPath, previewPath, counts }, null, 2));
console.log(inspection.ndjson);
console.log(errorScan.ndjson);
