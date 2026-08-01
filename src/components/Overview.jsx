import React, { useEffect, useMemo, useState } from "react";
import ReviewMetric from "./ReviewMetric";
import SentimentMeter from "./SentimentMeter";
import HistoricalAnalysis from "./HistoricalAnalysis";

import { convertCsvToInitialData } from "../tools/convert";

function Overview({ dataset }) {
  const [initialData, setInitialData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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
                      `Failed to fetch dataset: ${response.status}`,
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
    return <div>Loading dataset...</div>;
  }

  if (error) {
    return <div className="error-message">Failed to load dataset: {error}</div>;
  }

  return (
    <div className="overview">
      <div className="review-metrics">
        <ReviewMetric
          label="Total Positive Reviews"
          value={totals.positive}
          textColor="#474973"
        />

        <ReviewMetric
          label="Total Negative Reviews"
          value={totals.negative}
          textColor="#474973"
        />

        <ReviewMetric
          label="Total Neutral Reviews"
          value={totals.neutral}
          textColor="#474973"
        />
      </div>

      <div className="data-visualization">
        <SentimentMeter
          positive={percentages.positive}
          negative={percentages.negative}
          neutral={percentages.neutral}
        />

        <HistoricalAnalysis data={initialData} />
      </div>
    </div>
  );
}

export default Overview;
