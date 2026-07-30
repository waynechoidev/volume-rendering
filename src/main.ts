import { EngineApplication } from "@/engine/application/EngineApplication";
import overviewReadme from "@/modules/00-overview/README.md?raw";
import overviewReadmeKo from "@/modules/00-overview/README.ko.md?raw";
import { VolumeRenderingModule as CameraRaysModule } from "@/modules/01-camera-rays/VolumeRenderingModule";
import cameraRaysReadme from "@/modules/01-camera-rays/README.md?raw";
import cameraRaysReadmeKo from "@/modules/01-camera-rays/README.ko.md?raw";
import cameraRayReconstructionUrl from "@/modules/01-camera-rays/camera-ray-reconstruction.svg?url&no-inline";
import { VolumeRenderingModule as RayBoxModule } from "@/modules/02-ray-box/VolumeRenderingModule";
import rayBoxReadme from "@/modules/02-ray-box/README.md?raw";
import rayBoxReadmeKo from "@/modules/02-ray-box/README.ko.md?raw";
import axisSlabIntervalUrl from "@/modules/02-ray-box/axis-slab-interval.svg?url&no-inline";
import slabIntersectionDiagramUrl from "@/modules/02-ray-box/slab-intersection.svg?url&no-inline";
import slabIntervalsDiagramUrl from "@/modules/02-ray-box/slab-intervals.svg?url&no-inline";
import { VolumeRenderingModule as HomogeneousMediumModule } from "@/modules/03-homogeneous-medium/VolumeRenderingModule";
import homogeneousMediumReadme from "@/modules/03-homogeneous-medium/README.md?raw";
import homogeneousMediumReadmeKo from "@/modules/03-homogeneous-medium/README.ko.md?raw";
import beerLambertUrl from "@/modules/03-homogeneous-medium/beer-lambert.svg?url&no-inline";
import { VolumeRenderingModule as DiscreteRenderingModule } from "@/modules/04-discrete-rendering/VolumeRenderingModule";
import discreteRenderingReadme from "@/modules/04-discrete-rendering/README.md?raw";
import discreteRenderingReadmeKo from "@/modules/04-discrete-rendering/README.ko.md?raw";
import discreteRayMarchingUrl from "@/modules/04-discrete-rendering/discrete-ray-marching.svg?url&no-inline";
import { VolumeRenderingModule as DensityTextureModule } from "@/modules/05-density-texture/VolumeRenderingModule";
import densityTextureReadme from "@/modules/05-density-texture/README.md?raw";
import densityTextureReadmeKo from "@/modules/05-density-texture/README.ko.md?raw";
import textureCoordinateVolumeUrl from "@/modules/05-density-texture/texture-coordinate-volume.svg?url&no-inline";
import trilinearFilteringUrl from "@/modules/05-density-texture/trilinear-filtering.svg?url&no-inline";
import uniformMemoryLayoutUrl from "@/modules/05-density-texture/uniform-memory-layout.svg?url&no-inline";
import { VolumeRenderingModule as TransferFunction1DModule } from "@/modules/06-aneurism-transfer-function/VolumeRenderingModule";
import transferFunction1DReadme from "@/modules/06-aneurism-transfer-function/README.md?raw";
import transferFunction1DReadmeKo from "@/modules/06-aneurism-transfer-function/README.ko.md?raw";
import { VolumeRenderingModule as TransferFunction2DModule } from "@/modules/07-2d-transfer-function/VolumeRenderingModule";
import transferFunction2DReadme from "@/modules/07-2d-transfer-function/README.md?raw";
import transferFunction2DReadmeKo from "@/modules/07-2d-transfer-function/README.ko.md?raw";

const withAssets = (
  readme: string,
  assets: Readonly<Record<string, string>>,
): string =>
  Object.entries(assets).reduce(
    (resolved, [path, url]) => resolved.replaceAll(path, url),
    readme,
  );

const application = new EngineApplication({
  repositoryUrl: "https://github.com/waynechoidev/volume-rendering",
  modules: [
    {
      label: "Volume Rendering",
      module: TransferFunction2DModule,
      readme: { en: overviewReadme, ko: overviewReadmeKo },
    },
    {
      label: "01 Camera Rays",
      module: CameraRaysModule,
      readme: {
        en: withAssets(cameraRaysReadme, {
          "./camera-ray-reconstruction.svg": cameraRayReconstructionUrl,
        }),
        ko: withAssets(cameraRaysReadmeKo, {
          "./camera-ray-reconstruction.svg": cameraRayReconstructionUrl,
        }),
      },
    },
    {
      label: "02 Ray Box Intersection",
      module: RayBoxModule,
      readme: {
        en: withAssets(rayBoxReadme, {
          "./axis-slab-interval.svg": axisSlabIntervalUrl,
          "./slab-intersection.svg": slabIntersectionDiagramUrl,
          "./slab-intervals.svg": slabIntervalsDiagramUrl,
        }),
        ko: withAssets(rayBoxReadmeKo, {
          "./axis-slab-interval.svg": axisSlabIntervalUrl,
          "./slab-intersection.svg": slabIntersectionDiagramUrl,
          "./slab-intervals.svg": slabIntervalsDiagramUrl,
        }),
      },
    },
    {
      label: "03 Homogeneous Medium",
      module: HomogeneousMediumModule,
      readme: {
        en: withAssets(homogeneousMediumReadme, {
          "./beer-lambert.svg": beerLambertUrl,
        }),
        ko: withAssets(homogeneousMediumReadmeKo, {
          "./beer-lambert.svg": beerLambertUrl,
        }),
      },
    },
    {
      label: "04 Discrete Rendering",
      module: DiscreteRenderingModule,
      readme: {
        en: withAssets(discreteRenderingReadme, {
          "./discrete-ray-marching.svg": discreteRayMarchingUrl,
        }),
        ko: withAssets(discreteRenderingReadmeKo, {
          "./discrete-ray-marching.svg": discreteRayMarchingUrl,
        }),
      },
    },
    {
      label: "05 Density Texture",
      module: DensityTextureModule,
      readme: {
        en: withAssets(densityTextureReadme, {
          "./texture-coordinate-volume.svg": textureCoordinateVolumeUrl,
          "./trilinear-filtering.svg": trilinearFilteringUrl,
          "./uniform-memory-layout.svg": uniformMemoryLayoutUrl,
        }),
        ko: withAssets(densityTextureReadmeKo, {
          "./texture-coordinate-volume.svg": textureCoordinateVolumeUrl,
          "./trilinear-filtering.svg": trilinearFilteringUrl,
          "./uniform-memory-layout.svg": uniformMemoryLayoutUrl,
        }),
      },
    },
    {
      label: "06 Aneurism 1D Transfer Function",
      module: TransferFunction1DModule,
      readme: {
        en: transferFunction1DReadme,
        ko: transferFunction1DReadmeKo,
      },
    },
    {
      label: "07 Aneurism 2D Transfer Function",
      module: TransferFunction2DModule,
      readme: {
        en: transferFunction2DReadme,
        ko: transferFunction2DReadmeKo,
      },
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
