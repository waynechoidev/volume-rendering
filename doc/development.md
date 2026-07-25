# Development and Validation

## Commands

```bash
npm run dev
npm run typecheck
npm test
npm run build
```

The Vite server binds to a non-loopback interface. Do not publish it directly to
the public internet.

## Secure remote WebGPU access

WebGPU requires a secure context. `localhost` is accepted locally, but another
device should use HTTPS. For a private tailnet, proxy the local Vite server with
Tailscale Serve:

```bash
tailscale serve --bg 5173
tailscale serve status
```

Open the HTTPS URL reported by `tailscale serve status` from the other device.
Vite must allow that hostname; keep machine-specific hostnames in the ignored
`.env.local` file rather than repository source. Stop a temporary proxy with
`tailscale serve reset` when persistence is not wanted.

## Manual WebGPU checklist

For every user-facing module:

- Open it from the module picker and confirm initialization succeeds.
- Change each runtime parameter and confirm immediate, stable output.
- Resize repeatedly at desktop and narrow mobile viewport sizes.
- Test portrait/landscape changes and a DPR change when available.
- Switch away and back to exercise destruction and reinitialization.
- Confirm the error screen remains readable on a small screen.
- Check for GPU validation errors reported by the application.
- Let animated modules run long enough to spot instability or continuing memory
  growth.

For `Compute Texture`, additionally confirm:

- The compute image covers the canvas without uninitialized edges.
- Odd canvas dimensions render correctly.
- Resizing preserves animation and only replaces the output texture.
- No CPU readback is involved.

When practical, repeat interactive checks on a real mobile device over the
private network. Agents can run automated commands and temporary servers, but
the user performs final browser and device-specific visual evaluation.

## Compatibility and expected failures

Use a current WebGPU-capable browser. The application reports clear failures for
an insecure context, missing `navigator.gpu`, unavailable adapters, shader
compilation errors, initialization validation errors, uncaptured GPU errors, and
device loss.

Adapter vendor and architecture strings are browser-provided descriptions, not
guaranteed retail GPU model names.

