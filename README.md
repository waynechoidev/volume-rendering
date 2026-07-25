# WebGPU Research Engine

A browser-first, compute-first WebGPU engine for graphics, GPU computing, and
neural-rendering research.

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
explicit module catalog:

```ts
const application = new EngineApplication({
  initialModule: "diagnostics",
  moduleCatalog: {
    diagnostics: {
      label: "Engine Diagnostics",
      module: EngineDiagnosticsModule,
    },
  },
});
```

The runtime module picker lists only catalog entries. Selecting a module destroys
the previous module and its resources, constructs the selected module class, and
stores the selection in the `?module=` URL parameter.

Each module owns its shaders, pipelines, algorithm-specific data, GPU resources,
runtime parameters, and cleanup.

## Verification

```bash
npm run typecheck
npm test
npm run build
```
