import React from "react";

interface AppProps {
  onGenerateConfig: () => void;
}

export function Menu({ onGenerateConfig }: AppProps) {
  return (
    <div
      style={{
        backgroundColor: "#f0f0f0",
        borderTop: "1px solid #ccc",
        padding: "16px",
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <button
        onClick={onGenerateConfig}
        style={{
          padding: "8px 16px",
          backgroundColor: "#007acc",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "14px",
        }}
      >
        Generate UI Config
      </button>
    </div>
  );
}
