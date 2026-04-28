import { Outlet, useLocation } from "react-router-dom";
import Map from "../pages/Map";

export default function MapLayout() {
  const location = useLocation();
  const isHome = location.pathname === "/";

  if (isHome) {
    return <Outlet />;
  }

  return (
    <div className="relative">
      <div className="fixed inset-0 z-0">
        <Map />
      </div>
      <div className="relative z-10 bg-white rounded-t-[2rem] mt-[30vh] shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3" />
        <Outlet />
      </div>
    </div>
  );
}
