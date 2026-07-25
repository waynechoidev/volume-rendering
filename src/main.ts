import { EngineApplication } from "./engine/application/EngineApplication";
import { ComputeTextureModule } from "./modules/compute-texture/ComputeTextureModule";
import { EngineDiagnosticsModule } from "./modules/engine-diagnostics/EngineDiagnosticsModule";
import { GPUParticleModule } from "./modules/gpu-particles/GPUParticleModule";
import { TriangleModule } from "./modules/triangle/TriangleModule";

const application = new EngineApplication({
  initialModule: "compute-texture",
  moduleCatalog: {
    triangle: {
      label: "Triangle",
      module: TriangleModule,
    },
    diagnostics: {
      label: "Engine Diagnostics",
      module: EngineDiagnosticsModule,
    },
    "compute-texture": {
      label: "Compute Texture",
      module: ComputeTextureModule,
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
