import { EngineApplication } from "./engine/application/EngineApplication";
import { ComputeTextureModule } from "./modules/compute-texture/ComputeTextureModule";
import { EngineDiagnosticsModule } from "./modules/engine-diagnostics/EngineDiagnosticsModule";
import { GPUParticleModule } from "./modules/gpu-particles/GPUParticleModule";
import { TriangleModule } from "./modules/triangle/TriangleModule";
const application = new EngineApplication({
  modules: [
    {
      label: "Triangle",
      module: TriangleModule,
    },
    {
      label: "Engine Diagnostics",
      module: EngineDiagnosticsModule,
    },
    {
      label: "Compute Texture",
      module: ComputeTextureModule,
    },
    {
      label: "GPU Particles",
      module: GPUParticleModule,
    },
  ],
});

void application.start();

window.addEventListener("pagehide", () => application.destroy(), {
  once: true,
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => application.destroy());
}
