import React from "react";

function Header() {
  return (
    <div className="header-container">
      <div className="app-logo-circle">
        <img className="header-icon" src="src\assets\app logo.svg" alt="Logo" />
      </div>
      <div className="app-title">
        <h1>Sentify</h1>
        <p className="large-semibold-text">AI Based E-Commerce Data Analysis</p>
      </div>
    </div>
  );
}

export default Header;
