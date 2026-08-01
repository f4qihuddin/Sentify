import React from "react";

function ActionButton({ type = "button", logo, label="", action, state = true, className = "", }) {
  return (
    <button
      type={type}
      className={`action-button ${className}`}
      onClick={action}
      disabled={!state}
    >
      <img src={logo} alt="" />
      {label}
    </button>
  );
}

export default ActionButton;