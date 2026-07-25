import { EngineApplication } from "./engine/application/EngineApplication";
import { GPUParticleModule } from "./modules/gpu-particles/GPUParticleModule";

const application = new EngineApplication({
  label: "GPU Particles",
  modules: [new GPUParticleModule()],
});

void application.start();

window.addEventListener("pagehide", () => application.destroy(), { once: true });

if (import.meta.hot) {
  import.meta.hot.dispose(() => application.destroy());
}
