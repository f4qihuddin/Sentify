import React from "react";
import SideBarButton from "./SideBarButton";
import "../styles/style.css";

const menuList = [
  { logo: "src/assets/overview.svg", label: "Overview", page: "" },
  { logo: "src/assets/import.svg", label: "Import", page: "Import" },
  { logo: "src/assets/export.svg", label: "Export", page: "Export" },
  {
    logo: "src/assets/plus minus.svg",
    label: "Analyze Sentiment",
    page: "AnalyzeSentiment",
  },
  { logo: "src/assets/bot.svg", label: "Ask AI", page: "AskAI" },
];

function SideBar() {
  return (
    <nav className="sidebar-container">
      {menuList.map((menu) => (
        <SideBarButton
          key={menu.label}
          logo={menu.logo}
          label={menu.label}
          page={menu.page}
        />
      ))}
    </nav>
  );
}

export default SideBar;
