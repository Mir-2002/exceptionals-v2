import React from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";

const Layout = ({ fullBleed = false }) => {
  return (
    <div className="bg-gray-50 min-h-screen w-full overflow-x-hidden">
      {/* Header with fixed height */}
      <div className="h-[70px]">
        <Header />
      </div>
      {/* Content area */}
      {fullBleed ? (
        <div className="w-full min-h-[calc(100vh-70px)]">
          <Outlet />
        </div>
      ) : (
        <div className="flex justify-center items-start min-h-[calc(100vh-70px)] pt-8 pb-8 w-full overflow-x-hidden">
          <div className="w-full max-w-screen-xl">
            <Outlet />
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
