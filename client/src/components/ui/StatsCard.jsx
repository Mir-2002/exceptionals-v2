import React from "react";

const StatsCard = ({ title, value, total, color = "blue", className = "" }) => {
  const colors = {
    blue: "bg-blue-50 text-blue-800 border-blue-200",
    green: "bg-green-50 text-green-800 border-green-200",
    purple: "bg-purple-50 text-purple-800 border-purple-200",
    orange: "bg-orange-50 text-orange-800 border-orange-200",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
  };

  return (
    <div className={`p-3 ${colors[color]} rounded border w-full ${className}`}>
      <p className="text-sm text-center">
        <span className="font-semibold">
          {value} {total !== undefined && `of ${total}`}
        </span>{" "}
        {title}
      </p>
    </div>
  );
};

export default StatsCard;
