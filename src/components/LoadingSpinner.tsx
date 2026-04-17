import React from "react";

interface LoadingSpinnerProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  fullPage?: boolean;
}

const sizes = {
  sm: { ring: 20, stroke: 3 },
  md: { ring: 36, stroke: 4 },
  lg: { ring: 52, stroke: 5 },
};

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message,
  size = "md",
  fullPage = false,
}) => {
  const { ring, stroke } = sizes[size];

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <svg
        width={ring}
        height={ring}
        viewBox="0 0 50 50"
        className="animate-spin"
        style={{ animationDuration: "0.8s" }}
      >
        {/* Track */}
        <circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={stroke}
        />
        {/* Arc */}
        <circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke="#008540"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray="80 45"
        />
      </svg>
      {message && (
        <span
          style={{
            fontSize: size === "sm" ? "12px" : size === "lg" ? "15px" : "13px",
            color: "#6b7280",
            fontFamily: "var(--font-title)",
            letterSpacing: "0.01em",
          }}
        >
          {message}
        </span>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(255,255,255,0.85)",
          zIndex: 9999,
        }}
      >
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;
