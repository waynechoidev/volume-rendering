import { EngineApplication } from "@/engine/application/EngineApplication";
import overviewReadme from "@/modules/00-overview/README.md?raw";
import overviewReadmeKo from "@/modules/00-overview/README.ko.md?raw";
import { VolumeRenderingModule as CameraRaysModule } from "@/modules/01-camera-rays/VolumeRenderingModule";
import cameraRaysReadme from "@/modules/01-camera-rays/README.md?raw";
import cameraRaysReadmeKo from "@/modules/01-camera-rays/README.ko.md?raw";
import { VolumeRenderingModule as RayBoxModule } from "@/modules/02-ray-box/VolumeRenderingModule";
import rayBoxReadme from "@/modules/02-ray-box/README.md?raw";
import rayBoxReadmeKo from "@/modules/02-ray-box/README.ko.md?raw";
import { VolumeRenderingModule as HomogeneousMediumModule } from "@/modules/03-homogeneous-medium/VolumeRenderingModule";
import homogeneousMediumReadme from "@/modules/03-homogeneous-medium/README.md?raw";
import homogeneousMediumReadmeKo from "@/modules/03-homogeneous-medium/README.ko.md?raw";
import { VolumeRenderingModule as DiscreteRenderingModule } from "@/modules/04-discrete-rendering/VolumeRenderingModule";
import discreteRenderingReadme from "@/modules/04-discrete-rendering/README.md?raw";
import discreteRenderingReadmeKo from "@/modules/04-discrete-rendering/README.ko.md?raw";
import { VolumeRenderingModule as DensityTextureModule } from "@/modules/05-density-texture/VolumeRenderingModule";
import densityTextureReadme from "@/modules/05-density-texture/README.md?raw";
import densityTextureReadmeKo from "@/modules/05-density-texture/README.ko.md?raw";
import { VolumeRenderingModule as DensityLightingModule } from "@/modules/06-density-lighting/VolumeRenderingModule";
import densityLightingReadme from "@/modules/06-density-lighting/README.md?raw";
import densityLightingReadmeKo from "@/modules/06-density-lighting/README.ko.md?raw";

const application = new EngineApplication({
  repositoryUrl: "https://github.com/waynechoidev/volume-rendering",
  modules: [
    {
      label: "Volume Rendering",
      module: DensityLightingModule,
      readme: { en: overviewReadme, ko: overviewReadmeKo },
    },
    {
      label: "01 Camera Rays",
      module: CameraRaysModule,
      readme: { en: cameraRaysReadme, ko: cameraRaysReadmeKo },
    },
    {
      label: "02 Ray Box Intersection",
      module: RayBoxModule,
      readme: { en: rayBoxReadme, ko: rayBoxReadmeKo },
    },
    {
      label: "03 Homogeneous Medium",
      module: HomogeneousMediumModule,
      readme: {
        en: homogeneousMediumReadme,
        ko: homogeneousMediumReadmeKo,
      },
    },
    {
      label: "04 Discrete Rendering",
      module: DiscreteRenderingModule,
      readme: {
        en: discreteRenderingReadme,
        ko: discreteRenderingReadmeKo,
      },
    },
    {
      label: "05 Density Texture",
      module: DensityTextureModule,
      readme: { en: densityTextureReadme, ko: densityTextureReadmeKo },
    },
    {
      label: "06 Density Lighting",
      module: DensityLightingModule,
      readme: { en: densityLightingReadme, ko: densityLightingReadmeKo },
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
