import { EngineApplication } from "./engine/application/EngineApplication";
import { EngineDiagnosticsModule } from "./modules/engine-diagnostics/EngineDiagnosticsModule";
import { GPUParticleModule } from "./modules/gpu-particles/GPUParticleModule";
import { TriangleModule } from "./modules/triangle/TriangleModule";

const application = new EngineApplication({
  initialModule: "gpu-particles",
  moduleCatalog: {
    triangle: {
      label: "Triangle",
      module: TriangleModule,
    },
    diagnostics: {
      label: "Engine Diagnostics",
      module: EngineDiagnosticsModule,
    },
    "gpu-particles": {
      label: "GPU Particles",
      module: GPUParticleModule,
    },
  },
});

void application.start();

window.addEventListener("pagehide", () => application.destroy(), { once: true });

if (import.meta.hot) {
  import.meta.hot.dispose(() => application.destroy());
}
