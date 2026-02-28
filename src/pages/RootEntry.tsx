import { Capacitor } from "@capacitor/core";
import { Navigate, useLocation } from "react-router-dom";

import LandingPage from "./LandingPage";

export default function RootEntry() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const shouldOpenApp =
    Capacitor.isNativePlatform() || params.has("ladder") || params.has("ladderId");

  if (shouldOpenApp) {
    return <Navigate to={{ pathname: "/app", search: location.search, hash: location.hash }} replace />;
  }

  return <LandingPage />;
}
