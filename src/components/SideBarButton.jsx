import React from "react";
import { NavLink } from "react-router-dom";
import "../styles/style.css";

function SideBarButton({ logo, label, page }) {
  const target = page ? `/${page}` : "/";

  return (
    <NavLink
      to={target}
      end={target === "/"}
      className={({ isActive }) => `sidebar-button${isActive ? " active" : ""}`}
    >
      <img src={logo} alt="Logo" className="sidebar-button-icon" />
      <span className="medium-semibold-text">{label}</span>
    </NavLink>
  );
}

export default SideBarButton;
