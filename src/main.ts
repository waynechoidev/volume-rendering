import { EngineApplication } from "@/engine/application/EngineApplication";
import { ComputeCircleModule } from "@/modules/compute-circle/ComputeCircleModule";
import computeCircleReadme from "@/modules/compute-circle/README.md?raw";
import { ComputeTextureModule } from "@/modules/compute-texture/ComputeTextureModule";
import computeTextureReadme from "@/modules/compute-texture/README.md?raw";
import { EngineDiagnosticsModule } from "@/modules/engine-diagnostics/EngineDiagnosticsModule";
import engineDiagnosticsReadme from "@/modules/engine-diagnostics/README.md?raw";
import { GPUParticleModule } from "@/modules/gpu-particles/GPUParticleModule";
import gpuParticlesReadme from "@/modules/gpu-particles/README.md?raw";
import { TriangleModule } from "@/modules/triangle/TriangleModule";
import triangleReadme from "@/modules/triangle/README.md?raw";

const application = new EngineApplication({
  repositoryUrl: "https://github.com/waynechoidev/webgpu-research-engine",
  modules: [
    {
      label: "Triangle",
      module: TriangleModule,
      readme: triangleReadme,
    },
    {
      label: "Compute Circle",
      module: ComputeCircleModule,
      readme: computeCircleReadme,
    },
    {
      label: "Engine Diagnostics",
      module: EngineDiagnosticsModule,
      readme: engineDiagnosticsReadme,
    },
    {
      label: "Compute Texture",
      module: ComputeTextureModule,
      readme: computeTextureReadme,
    },
    {
      label: "GPU Particles",
      module: GPUParticleModule,
      readme: gpuParticlesReadme,
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
