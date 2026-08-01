import React, { useMemo, useState } from "react";
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

import dropdownIcon from "../assets/dropdown.svg";
import dropdownActiveIcon from "../assets/dropdown-active.svg";

const COLORS = ["#474973", "#161B33", "#A69CAC"];

function HistoricalAnalysis({ data = [] }) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  /*
   * null berarti pengguna belum menentukan filter.
   * Jika null, grafik menggunakan lima tahun terakhir.
   */
  const [selectedRange, setSelectedRange] = useState(null);

  /*
   * Nilai sementara yang ditampilkan dalam form.
   * Nilai ini baru diterapkan setelah tombol Terapkan diklik.
   */
  const [draftRange, setDraftRange] = useState({
    startYear: "",
    endYear: "",
  });

  const [filterError, setFilterError] = useState("");

  /*
   * Membersihkan data dari parent dan memastikan nilai
   * positive, negative, serta neutral berupa angka.
   */
  const chartData = useMemo(() => {
    return data
      .map((item) => ({
        year: String(item.year),
        positive: Number(item.positive) || 0,
        negative: Number(item.negative) || 0,
        neutral: Number(item.neutral) || 0,
      }))
      .filter((item) => Number.isFinite(Number(item.year)))
      .sort((a, b) => Number(a.year) - Number(b.year));
  }, [data]);

  /*
   * Mengambil daftar tahun yang tersedia tanpa duplikasi.
   */
  const availableYears = useMemo(() => {
    return [...new Set(chartData.map((item) => Number(item.year)))].sort(
      (a, b) => a - b,
    );
  }, [chartData]);

  const firstAvailableYear = availableYears[0];

  const lastAvailableYear = availableYears[availableYears.length - 1];

  /*
   * Default grafik adalah lima tahun kalender terakhir.
   *
   * Contoh:
   * tahun terakhir = 2026
   * tahun mulai    = 2026 - 4 = 2022
   * rentang        = 2022–2026
   */
  const defaultRange = useMemo(() => {
    if (availableYears.length === 0) {
      return null;
    }

    return {
      startYear: Math.max(firstAvailableYear, lastAvailableYear - 4),
      endYear: lastAvailableYear,
    };
  }, [availableYears.length, firstAvailableYear, lastAvailableYear]);

  /*
   * activeRange adalah rentang yang benar-benar digunakan
   * oleh grafik.
   *
   * Jika belum ada filter pengguna, gunakan defaultRange.
   */
  const activeRange = useMemo(() => {
    if (!defaultRange) {
      return null;
    }

    if (!selectedRange) {
      return defaultRange;
    }

    /*
     * Jika dataset berubah dan filter lama berada di luar
     * dataset baru, kembali ke rentang default.
     */
    const rangeIsValid =
      selectedRange.startYear >= firstAvailableYear &&
      selectedRange.endYear <= lastAvailableYear &&
      selectedRange.startYear <= selectedRange.endYear &&
      selectedRange.endYear - selectedRange.startYear <= 4;

    return rangeIsValid ? selectedRange : defaultRange;
  }, [selectedRange, defaultRange, firstAvailableYear, lastAvailableYear]);

  /*
   * Filter data berdasarkan activeRange.
   * Data inilah yang akan diberikan kepada BarChart.
   */
  const filteredData = useMemo(() => {
    if (!activeRange) {
      return [];
    }

    return chartData.filter((item) => {
      const year = Number(item.year);

      return year >= activeRange.startYear && year <= activeRange.endYear;
    });
  }, [chartData, activeRange]);

  /*
   * Menghitung total sentimen hanya dari data yang sedang
   * ditampilkan.
   */
  const aggregated = useMemo(() => {
    return filteredData.reduce(
      (accumulator, item) => ({
        positive: accumulator.positive + item.positive,
        negative: accumulator.negative + item.negative,
        neutral: accumulator.neutral + item.neutral,
      }),
      {
        positive: 0,
        negative: 0,
        neutral: 0,
      },
    );
  }, [filteredData]);

  /*
   * Format data untuk PieChart dan custom legend.
   */
  const aggregatedData = useMemo(() => {
    const total = aggregated.positive + aggregated.negative + aggregated.neutral;

    return [
      {
        name: "Positive",
        value: aggregated.positive,
        percentage: total > 0 ? (aggregated.positive / total) * 100 : 0,
      },
      {
        name: "Negative",
        value: aggregated.negative,
        percentage: total > 0 ? (aggregated.negative / total) * 100 : 0,
      },
      {
        name: "Neutral",
        value: aggregated.neutral,
        percentage: total > 0 ? (aggregated.neutral / total) * 100 : 0,
      },
    ];
  }, [aggregated]);

  /*
   * Membuka atau menutup dropdown.
   * Saat dibuka, form diisi dengan rentang yang aktif.
   */
  function handleToggleFilter() {
    if (!isFilterOpen && activeRange) {
      setDraftRange({
        startYear: String(activeRange.startYear),
        endYear: String(activeRange.endYear),
      });

      setFilterError("");
    }

    setIsFilterOpen((currentValue) => !currentValue);
  }

  /*
   * Memperbarui nilai sementara pada input.
   */
  function handleDraftChange(event) {
    const { name, value } = event.target;

    setDraftRange((currentRange) => ({
      ...currentRange,
      [name]: value,
    }));

    setFilterError("");
  }

  /*
   * Memvalidasi dan menerapkan filter.
   */
  function handleApplyFilter(event) {
    event.preventDefault();

    if (!defaultRange) {
      setFilterError("Dataset tidak memiliki data tahun.");
      return;
    }

    const startYear = Number(draftRange.startYear);

    const endYear = Number(draftRange.endYear);

    if (!Number.isInteger(startYear) || !Number.isInteger(endYear)) {
      setFilterError("Tahun mulai dan tahun akhir harus diisi.");
      return;
    }

    if (startYear > endYear) {
      setFilterError("Tahun mulai tidak boleh melebihi tahun akhir.");
      return;
    }

    /*
     * Selisih maksimal 4 berarti maksimal lima tahun
     * secara inklusif.
     *
     * Contoh: 2022–2026 = lima tahun.
     */
    if (endYear - startYear > 4) {
      setFilterError("Rentang maksimal adalah lima tahun.");
      return;
    }

    if (startYear < firstAvailableYear || endYear > lastAvailableYear) {
      setFilterError(
        `Tahun harus berada antara ${firstAvailableYear} dan ${lastAvailableYear}.`,
      );
      return;
    }

    setSelectedRange({
      startYear,
      endYear,
    });

    setFilterError("");
    setIsFilterOpen(false);
  }

  /*
   * Teks rentang yang ditampilkan pada UI.
   */
  const rangeLabel = activeRange
    ? `${activeRange.startYear} - ${activeRange.endYear}`
    : "Tidak ada data";

  return (
    <div className="historical-analysis">
      <div className="historical-bar-chart">
        <h2>Historical Analysis</h2>

        {filteredData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={filteredData}
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
        ) : (
          <p className="historical-empty-text">
            Tidak ada data dalam rentang tahun ini.
          </p>
        )}

        <div className="custom-legend">
          {aggregatedData.map((item, index) => (
            <div key={item.name} className="custom-legend-item">
              <div className="custom-legend-box">
                <div
                  className="custom-legend-color"
                  style={{
                    backgroundColor: COLORS[index],
                  }}
                />

                <span className="custom-legend-label">{item.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="historical-pie-chart">
        <div className="year-filter">
          <div className="year-filter-menu">
            <div className="year-filter-label">
              <p className="small-semibold-text-gray">Year Range</p>

              <p className="large-semibold-text">{rangeLabel}</p>
            </div>

            <button
              type="button"
              className="year-filter-button"
              aria-label={
                isFilterOpen ? "Tutup filter tahun" : "Buka filter tahun"
              }
              aria-expanded={isFilterOpen}
              disabled={!activeRange}
              onClick={handleToggleFilter}
            >
              <img
                key={isFilterOpen ? "active" : "inactive"}
                src={isFilterOpen ? dropdownActiveIcon : dropdownIcon}
                alt=""
                className="dropdown-icon"
              />
            </button>

            {isFilterOpen && (
              <form className="year-filter-form" onSubmit={handleApplyFilter}>
                <label className="year-filter-field">
                  <span>Start Year</span>

                  <input
                    type="number"
                    name="startYear"
                    value={draftRange.startYear}
                    min={firstAvailableYear}
                    max={lastAvailableYear}
                    onChange={handleDraftChange}
                  />
                </label>

                <label className="year-filter-field">
                  <span>End Year</span>

                  <input
                    type="number"
                    name="endYear"
                    value={draftRange.endYear}
                    min={firstAvailableYear}
                    max={lastAvailableYear}
                    onChange={handleDraftChange}
                  />
                </label>

                {filterError && (
                  <p className="year-filter-error">{filterError}</p>
                )}

                <button type="submit" className="year-filter-apply">
                  Apply
                </button>
              </form>
            )}
          </div>
        </div>

        {aggregatedData.some((item) => item.value > 0) ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={aggregatedData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
              >
                {aggregatedData.map((entry, index) => (
                  <Cell key={`cell-${entry.name}`} fill={COLORS[index]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="historical-empty-text">Tidak ada data sentimen.</p>
        )}

        <div className="custom-legend">
          {aggregatedData.map((item, index) => (
            <div key={item.name} className="custom-legend-item">
              <div className="custom-legend-box">
                <div
                  className="custom-legend-color"
                  style={{ backgroundColor: COLORS[index] }}
                ></div>
                <span className="custom-legend-label">{item.name}:</span>
              </div>
              <span className="custom-legend-percentage">
                {item.percentage.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default HistoricalAnalysis;
