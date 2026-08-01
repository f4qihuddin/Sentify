import Papa from "papaparse";

export function convertCsvToInitialData(csvText) {
  // Menghapus UTF-8 BOM jika terdapat di awal CSV
  const cleanedCsv = csvText.replace(/^\uFEFF/, "");

  const { data, errors } = Papa.parse(cleanedCsv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase(),
  });

  if (errors.length > 0) {
    console.warn("Peringatan saat membaca CSV:", errors);
  }

  const groupedByYear = data.reduce((result, row) => {
    const year = String(row.tahun || "").trim();
    const label = String(row.label || "").trim().toLowerCase();

    if (!year || !["positive", "negative", "neutral"].includes(label)) {
      return result;
    }

    if (!result[year]) {
      result[year] = {
        year,
        positive: 0,
        negative: 0,
        neutral: 0,
      };
    }

    result[year][label] += 1;

    return result;
  }, {});

  return Object.values(groupedByYear).sort(
    (a, b) => Number(a.year) - Number(b.year)
  );
}