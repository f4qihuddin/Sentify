import { useState } from "react";
import ActionButton from "./ActionButton";

const API_URL =
  import.meta.env.VITE_SENTIMENT_API_URL ?? "http://localhost:8000/predict";

function AnalyzeSentiment() {
  const [input, setInput] = useState("");
  const [prediction, setPrediction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAnalyze(event) {
    event.preventDefault();

    const review = input.trim();

    if (!review) {
      setError("Please enter a review first.");
      return;
    }

    try {
      setIsLoading(true);
      setPrediction(null);
      setError("");

      const response = await fetch(API_URL, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          review,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.detail ?? `Request failed with status ${response.status}`,
        );
      }

      setPrediction(result);
    } catch (requestError) {
      console.error("Prediction failed:", requestError);

      if (requestError instanceof TypeError) {
        setError(
          "Unable to reach the backend. Make sure the container is running.",
        );
      } else {
        setError(requestError.message);
      }
    } finally {
      setIsLoading(false);
    }
  }

  function handleClear() {
    setInput("");
    setPrediction(null);
    setError("");
  }

  return (
    <div className="analyze-sentiment-container">
      <form className="analyze-sentiment-form" onSubmit={handleAnalyze}>
        <textarea
          className="analyze-sentiment-input"
          placeholder="Type here..."
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={isLoading}
          required
        />

        <div className="analyze-sentiment-button-container">
          <ActionButton
            type="submit"
            logo="/src/assets/magnifying glass.svg"
            label={isLoading ? "Analyzing..." : "Analyze"}
            state={!isLoading && input.trim().length > 0}
            className="analyze-button"
          />

          <ActionButton
            type="button"
            logo="/src/assets/delete.svg"
            label="Clear"
            action={handleClear}
            state={!isLoading}
          />
        </div>
      </form>

      <div className="sentiment-prediction">
        {isLoading && (
          <p className="large-semibold-text">Analyzing Review...</p>
        )}

        {!isLoading && error && (
          <p className="sentiment-error" role="alert">
            {error}
          </p>
        )}

        {!isLoading && !error && prediction && (
          <div className="sentiment-result-container">
            <p className="large-semibold-text">
              Sentiment:{" "}
              <span
                className={
                  prediction.sentiment === "positive"
                    ? "sentiment-positive"
                    : "sentiment-negative"
                }
              >
                {prediction.sentiment}
              </span>
            </p>

            <p>Confidence: {(prediction.confidence * 100).toFixed(2)}%</p>
          </div>
        )}

        {!isLoading && !error && !prediction && (
          <p className="large-semibold-text">
            Enter a review to classify sentiment
          </p>
        )}
      </div>
    </div>
  );
}

export default AnalyzeSentiment;
