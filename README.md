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

## Selecting a Module

`src/main.ts` is the composition entry point. Import the modules you want to run
and pass them to `EngineApplication`:

```ts
const application = new EngineApplication({
  modules: [new EngineDiagnosticsModule()],
});
```

Each module owns its shaders, pipelines, algorithm-specific data, GPU resources,
runtime parameters, and cleanup.

## Verification

```bash
npm run typecheck
npm test
npm run build
```
