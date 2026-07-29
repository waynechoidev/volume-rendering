# WebGPU Research Engine User Guidelines

## Purpose

This repository provides a reusable, general-purpose WebGPU engine for graphics
and GPU-compute research.

Agents should help the user build research experiments on top of the engine
without coupling the engine to a particular algorithm.

---

## Derived Project Documentation

When this template is used to create a separate research repository, replace
the root `README.md` with documentation for that project. Do not retain the
engine repository README as the project's main description.

The project README should explain the project's goal, method, controls,
parameters, execution instructions, and current limitations. Include only a
short engine attribution that links to
`https://github.com/waynechoidev/webgpu-research-engine` and states that the
derived repository contains a development-time snapshot of the engine. Record
the source tag or commit when it is known, and do not imply that the copied
engine automatically tracks upstream changes.

Follow `doc/template-project.md` for the expected README structure.

Set the `EngineApplication.repositoryUrl` option in `src/main.ts` to the derived
project's own GitHub repository. The toolbar GitHub button represents the
currently running project; do not leave it pointing to the engine repository.
Keep the upstream engine link in the README attribution instead.

---

## Default Working Area

Research implementations belong under:

```text
src/modules/
```

Each research project should be an independent module containing its own:

- TypeScript integration code
- WGSL shaders
- render and compute pipelines
- algorithm-specific data structures
- GPU buffers, textures, and bind groups
- runtime parameters
- resource cleanup

Modules are defined by the `EngineModule` contract, not by a required
implementation style. A module may be implemented as a class, an object literal,
or a factory function returning an `EngineModule`.

Prefer the simplest form that keeps state and GPU resource ownership clear. Do
not introduce inheritance hierarchies merely to implement a module.

Do not place research-specific behavior in engine directories.

Do not make one research module depend directly on another research module.

---

## Source Boundaries

The source tree is divided by responsibility:

```text
src/
├── engine/      # Reusable engine infrastructure
├── modules/     # Examples and research implementations
└── main.ts      # Active module composition only
```

Dependencies flow in one direction:

```text
main -> modules -> engine
```

Engine code must never import from `modules` or `main`.

Use the `@/` alias for every import whose target is under `src/`, including
files in the same directory and raw WGSL or Markdown imports. Do not introduce
relative `./` or `../` source imports.

Examples and research implementations both belong in `modules`. Examples such
as Triangle and Engine Diagnostics validate generic behavior but must not become
hidden engine dependencies.

The reusable application host belongs in `engine/application`. Root `main.ts`
only selects and registers what runs. It must remain thin and contain no
rendering algorithm.

Register runnable module classes in the explicit `modules` list in `src/main.ts`.
Do not automatically expose every filesystem entry under `src/modules/`.
Place the most recently added runnable module first in the list; the first
entry is the default module.
Switching modules must destroy the previous module and its owned resources
before activating the next one.

The README viewer supports multiple languages through language-code keys.
English `README.md` is the required base document. This repository currently
maintains Korean as its only additional language in `README.ko.md`; do not add
other translations unless the user requests them. Register every available
document through the localized readme object and keep formulas, code examples,
and technical coverage synchronized. Keep the main document title in English
in every language version, and retain established graphics and API terms in
English rather than spelling their pronunciation in Hangul.

---

## Use the Engine

Use existing public engine APIs for:

- GPU context and device access
- frame scheduling
- render and compute command submission
- camera data
- pointer, touch, and keyboard input
- runtime parameters and debug UI
- statistics and diagnostics

Modules must not create competing global systems or attach independent DOM input
listeners.

Follow the engine module lifecycle and release every resource owned by the
module.

Do not modify engine infrastructure merely to simplify one research algorithm.

If a missing capability would be useful to multiple unrelated modules, a generic
engine change may be appropriate. Keep that change independent of the current
algorithm and preserve existing public APIs where possible.

When work on engine internals is necessary, also follow the temporary engine
development specifications under `doc/` when those files are present.

---

## Collaboration

Agents should handle the complete application and GPU pipeline integration
needed to make a research module run, including:

- module scaffolding
- TypeScript application code
- GPU resource creation and ownership
- bind group and pipeline setup
- data upload
- camera, input, and UI integration
- responsive layout
- execution, validation, and debugging

Shader and algorithm work is collaborative. The user and agents may both write,
modify, debug, and optimize WGSL or algorithm code.

Preserve user changes and inspect overlapping code before editing it.

---

## Shader Contracts

Keep the contract between TypeScript and WGSL explicit and synchronized:

- bind group and binding indices
- WGSL structure layouts
- byte alignment and padding
- buffer usage flags
- texture formats and access modes
- shader-stage visibility
- workgroup sizes
- dispatch dimensions

Keep non-obvious contract documentation inside the module that owns it.

Report invalid assumptions and GPU validation failures clearly.

---

## Performance

Prefer:

- GPU-side computation
- storage buffers and storage textures
- resource reuse
- batched GPU work
- deterministic behavior where practical

Avoid:

- unnecessary CPU-GPU synchronization
- per-frame GPU resource creation
- repeated allocations in update or render loops
- duplicated resources
- unnecessary CPU readback
- blocking CPU work

Do not hide important WebGPU behavior behind abstractions that make research code
difficult to inspect or modify.

---

## Responsive and Mobile Behavior

Every research module, example, runtime control, diagnostic view, and error
screen must be usable on desktop and mobile devices.

Support:

- viewport resizing
- portrait and landscape orientation
- device-pixel ratio changes
- configurable DPR or rendering-resolution limits
- safe areas
- pointer and touch input
- devices without hover, a mouse, or a physical keyboard

Runtime controls and statistics must remain readable and operable on small
screens without unnecessarily covering the research output.

Use the engine input APIs instead of implementing device-specific DOM event
handling inside a module.

Choose mobile defaults that respect limited GPU performance and memory.

---

## Development Access

Development mode must be accessible from other devices on the same Tailscale
network.

Bind the development server to a non-loopback interface such as `0.0.0.0`.

Use the host machine's Tailscale IP for direct access. Prefer Tailscale Serve
HTTPS when remote WebGPU execution requires a secure context.

Remote WebGPU verification requires more than binding Vite to `0.0.0.0`.
Configure an HTTPS terminator or reverse proxy that forwards a trusted HTTPS
hostname to the local Vite HTTP port. Add the exact forwarded hostname to
`DEV_ALLOWED_HOSTS` in the ignored `.env.local` file so Vite accepts the proxy's
Host header.

Verify the final HTTPS URL from the remote device. The certificate hostname, the
browser URL, and the Vite allowed host must match. Do not use a raw IP address or
an unqualified short hostname for HTTPS verification.

Do not expose the development server to the public internet unless the user
explicitly requests it.

The user normally runs examples for evaluation. Agents may run them when needed
for implementation, validation, troubleshooting, or debugging. Stop temporary
development servers when they are no longer needed.

---

## Technology

Use the existing project stack:

- TypeScript
- WebGPU
- WGSL
- Vite
- gl-matrix
- lil-gui

Keep the project framework-independent.

Do not introduce React, Vue, another application framework, or an unnecessary
dependency unless the user explicitly requests it.

Prefer `gl-matrix` over implementing a custom vector or matrix library.

---

## Verification

Verify changes with the available project commands for:

- type checking
- CPU-side tests
- production builds
- visual WebGPU validation

Test user-facing behavior at desktop and mobile viewport sizes. When available,
use a real mobile device on the tailnet for interactive GPU validation.

When handing work back to the user, report:

- what changed
- what was verified
- what still needs visual or device-specific evaluation
- known performance or compatibility limitations
