import { useState } from "react";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Deliveries from "./pages/Deliveries";
import Riders from "./pages/Riders";
import MyDeliveries from "./pages/MyDeliveries";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

type Screen = "home" | "dashboard" | "deliveries" | "riders" | "my-deliveries";

function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const navigate = (nextScreen: Screen) => setScreen(nextScreen);

  if (screen === "home") return <Home onNavigate={navigate} />;
  if (screen === "my-deliveries") return <MyDeliveries />;

  const activeScreen = screen === "dashboard" || screen === "deliveries" || screen === "riders" ? screen : "dashboard";
  const pageTitles: Record<"dashboard" | "deliveries" | "riders", { title: string; subtitle: string }> = {
    dashboard: { title: "Reflex Control Room", subtitle: "Live last-mile delivery operations" },
    deliveries: { title: "Deliveries", subtitle: "Monitor and manage delivery activity" },
    riders: { title: "Riders", subtitle: "Monitor rider availability and assignments" },
  };
  const currentPage = pageTitles[activeScreen];

  return <div className="app-shell"><Sidebar activeScreen={activeScreen} onNavigate={navigate} /><main className="main-content"><Topbar title={currentPage.title} subtitle={currentPage.subtitle} /><div className="content-area">{screen === "dashboard" && <Dashboard onNavigate={navigate} />}{screen === "deliveries" && <Deliveries />}{screen === "riders" && <Riders />}</div></main></div>;
}

export default App;
