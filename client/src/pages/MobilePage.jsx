import React from "react";

const MobilePage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-6 text-center">
      <img src="/logo.jpg" alt="App Logo" className="w-20 h-20 mb-6" />
      <h1 className="text-3xl font-bold mb-4 text-gray-800">Desktop Only</h1>
      <p className="text-lg text-gray-600 mb-2">
        This application is designed for desktop browsers.
      </p>
      <p className="text-gray-500">
        Please access the site using your desktop or laptop for the best
        experience.
      </p>
    </div>
  );
};

export default MobilePage;
