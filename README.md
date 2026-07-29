# WebGPU Research Engine

A browser-first, compute-first engine for general-purpose WebGPU research and
experimentation.

[Open the live sample](https://waynechoidev.github.io/webgpu-research-engine/)

## Getting Started

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. The development server listens on
`0.0.0.0`, so other devices on the same network can also connect when the
development environment permits it.

WebGPU requires a secure context. `localhost` is accepted for local development,
but access from another device must be served through trusted HTTPS.

For remote development:

1. Run the Vite development server on its local HTTP port.
2. Configure a trusted HTTPS reverse proxy or private-network serving tool to
   forward its HTTPS hostname to the Vite port.
3. Add that hostname to `DEV_ALLOWED_HOSTS` in the ignored `.env.local` file.
4. Open the matching HTTPS hostname from the remote device.

The certificate must match the hostname used by the browser. An HTTPS URL using
a raw IP address or an unconfigured short hostname is not sufficient.

## Camera Controls

- Drag: orbit
- Mouse wheel or pinch: zoom
- Right-drag or Shift+drag: pan
- Two-finger drag: pan

## Project Structure

```text
src/
├── engine/      # Reusable engine infrastructure
├── modules/     # Examples and independent research modules
└── main.ts      # Active module composition
```

Included modules:

- `triangle`: minimal WebGPU rendering example
- `engine-diagnostics`: camera, input, UI, statistics, and resource validation
- `gpu-particles`: compute-driven particle simulation and instanced rendering

The GPU Particle module keeps particle state in ping-pong storage buffers. A
compute pass updates the state and the render pass consumes the new buffer
directly, without CPU readback. Particle count changes recreate the
size-dependent buffers; ordinary simulation parameters reuse existing GPU
resources.

## Selecting a Module

`src/main.ts` is the composition entry point. Register module classes in its
explicit `modules` list:

```ts
const application = new EngineApplication({
  repositoryUrl: "https://github.com/owner/research-project",
  modules: [
    {
      label: "Engine Diagnostics",
      module: EngineDiagnosticsModule,
      readme: engineDiagnosticsReadme,
    },
  ],
});
```

The runtime module picker lists the configured entries. Selecting a module destroys
the previous module and its resources and constructs the selected module class.
Selection does not modify the page URL; reloading starts the first `modules`
entry. Shared desktop and touch controls are available through the controls icon
in the statistics panel. When a module supplies Markdown through `readme`, its
separate `README` button opens a responsive viewer with KaTeX math rendering.

Each module owns its shaders, pipelines, algorithm-specific data, GPU resources,
runtime parameters, and cleanup.

## Documentation

- [Engine API](doc/engine-api.md)
- [Research module guide](doc/module-guide.md)
- [Development and validation](doc/development.md)
- [GitHub Pages deployment](doc/github-pages.md)
- [Template project documentation](doc/template-project.md)

## Verification

```bash
npm run typecheck
npm test
npm run build
```

## GitHub Pages

The workflow at `.github/workflows/deploy-pages.yml` tests, builds, and deploys
the application whenever `main` is pushed. It derives the Vite base path from
the GitHub repository name, so repositories created from this template do not
need a hard-coded deployment path.

See [GitHub Pages deployment](doc/github-pages.md) for the required repository
settings and deployment procedure.
