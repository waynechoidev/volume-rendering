import { EngineApplication } from "./engine/application/EngineApplication";
import { EngineDiagnosticsModule } from "./modules/engine-diagnostics/EngineDiagnosticsModule";

const application = new EngineApplication({
  label: "Engine Diagnostics",
  modules: [new EngineDiagnosticsModule()],
});

void application.start();

window.addEventListener("pagehide", () => application.destroy(), { once: true });

if (import.meta.hot) {
  import.meta.hot.dispose(() => application.destroy());
}
