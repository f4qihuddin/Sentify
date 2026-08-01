import React, { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

function SentimentMeter({ positive, negative, neutral }) {
  const data = [
    { name: "Positive", value: positive || 0 },
    { name: "Negative", value: negative || 0 },
    { name: "Neutral", value: neutral || 0 },
  ];

  const COLORS = ["#474973", "#161B33", "#A69CAC"];

  return (
    <div className="sentiment-meter">
      <h2>Sentiment Meter</h2>
      <ResponsiveContainer width="100%" height="100%">
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

      {/* Custom Legend */}
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
            <span className="custom-legend-percentage">{item.value.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SentimentMeter;
