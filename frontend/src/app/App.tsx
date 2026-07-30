import { BrowserRouter } from "react-router-dom";
import { AppRouter } from "./router/AppRouter";
import { RouteExperience } from "./router/RouteExperience";
import { PwaNotices } from "../pwa/service-worker/PwaNotices";

function App() {
  return (
    <BrowserRouter>
      <RouteExperience />
      <PwaNotices />
      <AppRouter />
    </BrowserRouter>
  );
}

export default App;
