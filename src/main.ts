import { EngineApplication } from "@/engine/application/EngineApplication";
import { ComputeCircleModule } from "@/modules/compute-circle/ComputeCircleModule";
import computeCircleReadme from "@/modules/compute-circle/README.md?raw";
import computeCircleReadmeKo from "@/modules/compute-circle/README.ko.md?raw";
import { ComputeTextureModule } from "@/modules/compute-texture/ComputeTextureModule";
import computeTextureReadme from "@/modules/compute-texture/README.md?raw";
import computeTextureReadmeKo from "@/modules/compute-texture/README.ko.md?raw";
import { EngineDiagnosticsModule } from "@/modules/engine-diagnostics/EngineDiagnosticsModule";
import engineDiagnosticsReadme from "@/modules/engine-diagnostics/README.md?raw";
import engineDiagnosticsReadmeKo from "@/modules/engine-diagnostics/README.ko.md?raw";
import { GPUParticleModule } from "@/modules/gpu-particles/GPUParticleModule";
import gpuParticlesReadme from "@/modules/gpu-particles/README.md?raw";
import gpuParticlesReadmeKo from "@/modules/gpu-particles/README.ko.md?raw";
import { TriangleModule } from "@/modules/triangle/TriangleModule";
import triangleReadme from "@/modules/triangle/README.md?raw";
import triangleReadmeKo from "@/modules/triangle/README.ko.md?raw";

const application = new EngineApplication({
  repositoryUrl: "https://github.com/waynechoidev/webgpu-research-engine",
  modules: [
    {
      label: "GPU Particles",
      module: GPUParticleModule,
      readme: { en: gpuParticlesReadme, ko: gpuParticlesReadmeKo },
    },
    {
      label: "Triangle",
      module: TriangleModule,
      readme: { en: triangleReadme, ko: triangleReadmeKo },
    },
    {
      label: "Compute Circle",
      module: ComputeCircleModule,
      readme: { en: computeCircleReadme, ko: computeCircleReadmeKo },
    },
    {
      label: "Engine Diagnostics",
      module: EngineDiagnosticsModule,
      readme: {
        en: engineDiagnosticsReadme,
        ko: engineDiagnosticsReadmeKo,
      },
    },
    {
      label: "Compute Texture",
      module: ComputeTextureModule,
      readme: { en: computeTextureReadme, ko: computeTextureReadmeKo },
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
