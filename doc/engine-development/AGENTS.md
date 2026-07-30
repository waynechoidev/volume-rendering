# WebGPU Research Engine Development Specification

## Purpose

This document defines the development rules for every AI agent contributing to this repository.

All implementations must follow these rules unless explicitly instructed otherwise.

The objective is to build a reusable **WebGPU Research Engine**, not a single rendering demo.

The engine should become a long-term, general-purpose foundation for graphics
and GPU-compute research.

---

# Core Philosophy

The engine is designed around the following principles.

- Browser-first
- WebGPU-first
- Compute-first
- Modular
- Research-oriented
- Reusable
- Extensible
- Algorithm independent

The engine itself should remain generic.

Research algorithms should be implemented independently from the engine.

---

# Primary Objective

Always prioritize building reusable engine infrastructure.

Never optimize the architecture for a single rendering algorithm.

Every implementation should increase the capability of the engine.

---

# Technology Stack

The project uses the following technologies.

- TypeScript
- WebGPU
- WGSL
- Vite
- gl-matrix
- lil-gui

Do not introduce additional frameworks unless explicitly requested.

Do not use React.

Do not use Vue.

The engine must remain framework independent.

---

# Engine Responsibilities

The engine is responsible for:

- GPU initialization
- Resource management
- Render pipelines
- Compute pipelines
- Camera
- Input
- Scene management
- Frame scheduling
- Debug utilities
- Runtime parameter management

The engine is **not** responsible for implementing research algorithms.

---

# Research Modules

Every rendering technique should be implemented as an independent module.

Examples:

- Volume Rendering
- Ray Marching
- Cloud Rendering
- NeRF
- Gaussian Splatting

Research modules may use engine APIs but must never modify engine architecture unless absolutely necessary.

---

# Engine Core Rules

The following directories represent engine infrastructure.

```text
src/engine/core
src/engine/graphics
src/engine/camera
src/engine/input
src/engine/math
src/engine/scene
src/engine/ui
```

These directories should remain generic.

Never place algorithm-specific logic inside these directories.

---

# Module Rules

Every research project must be implemented inside

```text
src/modules/
```

Each module owns:

- its shaders
- its GPU pipelines
- its renderer
- its data structures
- its resource management

The engine module API is a structural contract. Implementations may use classes,
object literals, or factory functions. Engine infrastructure must not require
inheritance or a specific construction pattern.

Modules should not depend on one another.

Modules communicate only through public engine APIs.

---

# Source Boundary Rules

The source tree is divided into engine infrastructure, independent modules, and
application composition.

```text
src/
├── engine/
├── modules/
└── main.ts
```

Dependencies must flow in one direction:

```text
main -> modules -> engine
```

The engine must never import modules or application bootstrap code.

Diagnostic and educational implementations belong in `src/modules/` alongside
research implementations.

The reusable application host belongs in `src/engine/application/`. Root
`src/main.ts` selects active modules but contains no algorithm or GPU pipeline
implementation.

Runnable module classes are listed in an explicit `modules` list. Do not use
filesystem-wide automatic discovery. Order modules by their intended
presentation sequence because the first list entry is the default. Progressive
tutorials should use ascending step order. Runtime switching must stop
execution, destroy the previous module and its resources, construct the
selected module, and then resume the engine.

---

# Directory Responsibilities

## core

Engine lifecycle.

Examples:

- Engine
- Renderer
- GPUContext
- FrameLoop
- ResourceManager

---

## graphics

GPU abstraction.

Examples:

- Compute Pipeline
- Render Pipeline
- Buffers
- Textures
- Bind Groups

---

## camera

Camera implementation.

Examples:

- Perspective Camera
- Orbit Camera
- Fly Camera

---

## input

Input handling.

Examples:

- Mouse
- Keyboard
- Camera Controls

---

## scene

Scene-related infrastructure.

Examples:

- Transform
- Bounding Box
- Scene Graph (optional)

---

## math

Utility mathematics.

Prefer gl-matrix whenever possible.

Avoid implementing custom vector or matrix libraries.

---

## ui

Runtime debugging.

Examples:

- FPS
- GPU timing
- Debug parameters
- Statistics

---

# WebGPU Rules

Always use modern WebGPU APIs.

Prefer:

- Compute Pipelines
- Storage Buffers
- Storage Textures

Avoid unnecessary CPU-GPU synchronization.

Reuse GPU resources whenever possible.

Minimize allocations inside the render loop.

---

# WGSL Rules

Every module owns its shaders.

Example

```text
modules/
    04-discrete-rendering/
        VolumeRenderingModule.ts
        volume.fragment.wgsl
```

Avoid placing module shaders inside global shader directories.

---

# Performance Rules

Performance is a primary objective.

Avoid:

- unnecessary allocations
- repeated buffer creation
- duplicated GPU resources
- blocking CPU operations

Prefer:

- resource reuse
- GPU computation
- batched operations

---

# Code Style

Prefer composition.

Avoid deep inheritance.

Keep classes focused.

Avoid overly generic abstractions.

Use meaningful names.

Keep functions small.

Avoid premature optimization.

---

# Public APIs

Engine APIs should remain stable.

Avoid breaking public interfaces.

If an API change is necessary, update every affected module.

---

# Camera Rules

The engine owns camera implementations.

Research modules should never implement their own camera systems.

Modules receive camera data through engine APIs.

---

# Input Rules

Mouse and keyboard belong to the engine.

Modules should never directly attach DOM event listeners.

Input must be routed through engine systems.

---

# UI Rules

The engine owns runtime debugging.

Research modules may register parameters.

The engine displays them.

---

# Responsive and Mobile Rules

All engine screens, examples, diagnostic views, and runtime UI must be responsive
and usable on both desktop and mobile devices.

Canvas sizing must follow the available viewport while accounting for device
pixel ratio and orientation changes.

Input systems must support pointer, touch, and keyboard input where applicable.
Research modules must use these engine input APIs instead of implementing
device-specific DOM event handling.

Runtime controls, error messages, statistics, and overlays must remain readable
and operable on small screens without covering essential content.

Do not assume a mouse, hover support, a physical keyboard, or a landscape
viewport.

Avoid unbounded device-pixel-ratio rendering resolutions. The engine should
provide a configurable resolution or DPR limit to protect mobile GPU performance
and memory usage.

Every user-facing milestone must be verified at desktop and mobile viewport
sizes. Interactive GPU examples must also be tested on a real mobile device when
one is available through the tailnet.

---

# Resource Rules

GPU resources should be owned by the module that creates them.

Resources should be released when the module is destroyed.

Avoid hidden ownership.

Ownership must always be explicit.

---

# Render Loop Rules

The engine owns the render loop.

Modules should expose update() and render() functions.

The engine schedules execution.

---

# Error Handling

Fail loudly.

Avoid silently ignoring GPU errors.

Prefer descriptive error messages.

---

# Testing

CPU-side logic should be testable.

GPU-side code should remain deterministic whenever possible.

---

# Example Execution

The user is responsible for running examples for normal use and evaluation.

AI agents should not assume that they must launch an example after every change.

However, AI agents may run examples independently when needed for development,
verification, troubleshooting, or debugging.

Any development server started by an AI agent should be treated as temporary and
stopped when it is no longer needed.

Development mode must support access from other devices on the same Tailscale
network.

The development server should listen on a non-loopback interface, such as
`0.0.0.0`, so it can be reached through the host machine's Tailscale IP address.

When WebGPU requires a secure context on a remote device, prefer exposing the
local development server through Tailscale Serve with HTTPS.

The HTTPS service must terminate TLS for a trusted hostname and proxy to the
local Vite HTTP port. Add that exact hostname to `DEV_ALLOWED_HOSTS` in the
ignored `.env.local` file. Verify that the certificate hostname, browser URL,
and Vite allowed host match.

Do not expose the development server to the public internet. Tailscale access
must remain private to the tailnet unless the user explicitly requests otherwise.

---

# Dependencies

Before adding a dependency, ask:

1. Is it necessary?
2. Can the engine already solve this?
3. Is the dependency lightweight?
4. Will it reduce maintainability?

Avoid unnecessary dependencies.

---

# Future Development

The engine is expected to support many future research projects.

New capabilities should be added to the engine only if they are reusable by multiple modules.

Otherwise, they belong inside the research module.

---

# What NOT to Do

Do not couple engine code to a specific algorithm.

Do not hardcode research-specific logic into engine infrastructure.

Do not modify unrelated systems.

Do not introduce framework-specific code.

Do not optimize exclusively for one project.

---

# Decision Rule

Whenever uncertain, ask the following question:

> **"Does this change improve the engine, or does it only improve one research module?"**

If the answer is **only one research module**, implement the change inside that module.

If the answer is **the engine as a whole**, implement it inside the engine.

This rule takes precedence over all other implementation decisions.
