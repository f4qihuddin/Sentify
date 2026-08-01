import React from "react";

function ReviewMetric({ label, value }) {
  return (
    <div className="review-metric-item">
      <p className="review-metric-label">{label}</p>
      <p className="larger-semibold-text">{value}</p>
    </div>
  );
}

export default ReviewMetric;
