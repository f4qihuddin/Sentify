import { useEffect, useRef, useMemo, useState } from "react";
import ActionButton from "./ActionButton";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { convertCsvToInitialData } from "../tools/convert";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

function Export({ dataset }) {
  const [initialData, setInitialData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const reportRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDataset() {
      if (!dataset) {
        setInitialData([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Dataset bawaan berupa URL, sedangkan hasil import berupa File.
        const csvText =
          dataset instanceof Blob
            ? await dataset.text()
            : await fetch(dataset, { signal: controller.signal }).then(
                (response) => {
                  if (!response.ok) {
                    throw new Error(
                      `Gagal mengambil dataset: ${response.status}`,
                    );
                  }

                  return response.text();
                },
              );

        // Mengubah data CSV ke format HistoricalAnalysis
        const convertedData = convertCsvToInitialData(csvText);

        setInitialData(convertedData);
      } catch (loadError) {
        if (loadError.name !== "AbortError") {
          console.error(loadError);
          setError(loadError.message);
          setInitialData([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadDataset();

    return () => {
      controller.abort();
    };
  }, [dataset]);

  const totals = useMemo(() => {
    return initialData.reduce(
      (result, item) => {
        result.positive += item.positive;
        result.negative += item.negative;
        result.neutral += item.neutral;

        return result;
      },
      {
        positive: 0,
        negative: 0,
        neutral: 0,
      },
    );
  }, [initialData]);

  const percentages = useMemo(() => {
    const totalReviews = totals.positive + totals.negative + totals.neutral;

    if (totalReviews === 0) {
      return {
        positive: 0,
        negative: 0,
        neutral: 0,
      };
    }

    return {
      positive: (totals.positive / totalReviews) * 100,
      negative: (totals.negative / totalReviews) * 100,
      neutral: (totals.neutral / totalReviews) * 100,
    };
  }, [totals]);

  if (isLoading) {
    return <div>Memuat dataset...</div>;
  }

  if (error) {
    return <div className="error-message">Gagal memuat dataset: {error}</div>;
  }

  const data = [
    { name: "Positive", value: percentages.positive || 0 },
    { name: "Negative", value: percentages.negative || 0 },
    { name: "Neutral", value: percentages.neutral || 0 },
  ];

  const COLORS = ["#474973", "#161B33", "#A69CAC"];

  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 4;

  const lastFiveYearsData = initialData
    .filter((item) => Number(item.year) >= startYear)
    .sort((a, b) => Number(a.year) - Number(b.year));

  async function handleExportPdf() {
    const reportElement = reportRef.current;

    if (!reportElement || isExporting) {
      return;
    }

    setIsExporting(true);

    const previousStyles = {
      height: reportElement.style.height,
      maxHeight: reportElement.style.maxHeight,
      overflow: reportElement.style.overflow,
    };

    try {
      // Memastikan seluruh isi report ikut ditangkap,
      // termasuk bagian yang sebelumnya harus di-scroll.
      reportElement.style.height = "auto";
      reportElement.style.maxHeight = "none";
      reportElement.style.overflow = "visible";

      reportElement.classList.add("pdf-export-mode");

      await document.fonts.ready;

      // Menunggu browser menyelesaikan pembaruan layout dan chart.
      await new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const margin = 10;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const availableWidth = pageWidth - margin * 2;
      const availableHeight = pageHeight - margin * 2;
      const sectionGap = 5;
      const pageBackground = [241, 218, 196];
      const exportBlocks = reportElement.querySelectorAll(".pdf-export-block");

      const paintPageBackground = () => {
        pdf.setFillColor(...pageBackground);
        pdf.rect(0, 0, pageWidth, pageHeight, "F");
      };

      const addPage = () => {
        pdf.addPage();
        paintPageBackground();
      };

      paintPageBackground();

      let cursorY = margin;

      // Render setiap bagian secara terpisah agar batas halaman tidak
      // memotong chart, legenda, atau tabel di tengah elemen.
      for (const block of exportBlocks) {
        const canvas = await html2canvas(block, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#F1DAC4",
          logging: false,
          windowWidth: reportElement.scrollWidth,
        });

        const imageHeight = (canvas.height * availableWidth) / canvas.width;

        if (imageHeight > availableHeight) {
          throw new Error(
            "Salah satu bagian laporan lebih tinggi dari satu halaman A4.",
          );
        }

        if (cursorY > margin && cursorY + imageHeight > pageHeight - margin) {
          addPage();
          cursorY = margin;
        }

        pdf.addImage(
          canvas.toDataURL("image/png"),
          "PNG",
          margin,
          cursorY,
          availableWidth,
          imageHeight,
          undefined,
          "FAST",
        );

        cursorY += imageHeight + sectionGap;
      }

      pdf.save("sentiment-analysis-report.pdf");
    } catch (exportError) {
      console.error("Gagal membuat PDF:", exportError);
      alert("PDF gagal dibuat. Silakan coba kembali.");
    } finally {
      reportElement.style.height = previousStyles.height;
      reportElement.style.maxHeight = previousStyles.maxHeight;
      reportElement.style.overflow = previousStyles.overflow;
      reportElement.classList.remove("pdf-export-mode");

      setIsExporting(false);
    }
  }

  return (
    <div className="export-container">
      <div className="export-preview">
        <div ref={reportRef} className="report-pdf-preview">
          <section className="pdf-export-block">
            <h1 className="larger-bold-text">Sentiment Analysis Report</h1>
            <div className="report-sub-title">
              <p className="large-semibold-text">Sentiment Metrics</p>
            </div>
            <div className="report-sentiment-metric">
              <div className="sentiment-metric-content">
                <p className="small-medium-text">Top Positive Reviews</p>
                <p className="small-medium-text">Top Negative Reviews</p>
                <p className="small-medium-text">Top Neutral Reviews</p>
              </div>
              <div className="sentiment-metric-content">
                <p className="small-medium-text">{totals.positive}</p>
                <p className="small-medium-text">{totals.negative}</p>
                <p className="small-medium-text">{totals.neutral}</p>
              </div>
            </div>
            <div className="separator"></div>
          </section>

          <section className="pdf-export-block">
            <div className="report-sub-title">
              <p className="large-semibold-text">Sentiment Distributions</p>
            </div>
            <div className="report-sentiment-distributions">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              <div className="custom-legend">
                {data.map((item, index) => (
                  <div key={item.name} className="custom-legend-item">
                    <div className="custom-legend-box">
                      <div
                        className="custom-legend-color"
                        style={{ backgroundColor: COLORS[index] }}
                      ></div>
                      <span className="custom-legend-label">{item.name}:</span>
                    </div>
                    <span className="custom-legend-percentage">
                      {item.value.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="separator"></div>
          </section>

          <section className="pdf-export-block">
            <div className="report-sub-title">
              <p className="large-semibold-text">Historical Analysis</p>
            </div>
            <div className="report-historical-analysis">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={lastFiveYearsData}
                  margin={{
                    top: 20,
                    right: 20,
                    left: 0,
                    bottom: 5,
                  }}
                  barCategoryGap="20%"
                >
                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis dataKey="year" />

                  <YAxis allowDecimals={false} />

                  <Tooltip />

                  <Bar
                    dataKey="positive"
                    name="Positive"
                    fill="#5b5f8d"
                    radius={[10, 10, 0, 0]}
                  />

                  <Bar
                    dataKey="negative"
                    name="Negative"
                    fill="#272643"
                    radius={[10, 10, 0, 0]}
                  />

                  <Bar
                    dataKey="neutral"
                    name="Neutral"
                    fill="#b7b1cc"
                    radius={[10, 10, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
              <div className="custom-legend">
                {data.map((item, index) => (
                  <div key={item.name} className="custom-legend-item">
                    <div className="custom-legend-box">
                      <div
                        className="custom-legend-color"
                        style={{ backgroundColor: COLORS[index] }}
                      ></div>
                      <span className="custom-legend-label">{item.name}:</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="pdf-export-block">
            <table>
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Positive</th>
                  <th>Negative</th>
                  <th>Neutral</th>
                </tr>
              </thead>
              <tbody>
                {lastFiveYearsData.map((item) => (
                  <tr key={item.year}>
                    <td>{item.year}</td>
                    <td>{item.positive}</td>
                    <td>{item.negative}</td>
                    <td>{item.neutral}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </div>
      <div className="button-container">
        <ActionButton
          logo="/src/assets/export.svg"
          label={isExporting ? "Creating PDF..." : "Export PDF"}
          action={handleExportPdf}
          state={!isExporting && initialData.length > 0}
        />
      </div>
    </div>
  );
}

export default Export;
