# Template Project Documentation

This repository can be used as a GitHub template for an independent WebGPU
research project. A repository created from the template contains a copy of the
engine at the point when the project was created; it is not the engine's own
documentation site.

## Replace the root README

Replace the template's root `README.md` with a project-specific README as soon
as the derived repository is created. The title and opening description should
identify the research project rather than WebGPU Research Engine.

The project README should cover:

- the research question or visual goal;
- the implemented method and relevant references;
- how to install and run the project;
- runtime controls and parameters;
- the module and shader organization;
- expected output, validation criteria, and known limitations;
- a live sample URL when one is deployed.

Do not copy the engine feature list, included sample list, or engine-development
instructions into the project README unless they are directly relevant to that
project.

## Repository button

Set `repositoryUrl` in `src/main.ts` to the derived project's own repository:

```ts
const application = new EngineApplication({
  repositoryUrl: "https://github.com/<account>/<project>",
  modules: [
    // Project modules
  ],
});
```

This URL controls the GitHub button displayed to the right of the README button.
Do not leave it pointing to WebGPU Research Engine after creating a derived
project. The engine source belongs in the small attribution section described
below; the runtime button should take users to the project they are viewing.

## Engine attribution

Keep the engine attribution short and subordinate to the project description.
Link to the source engine and state that the repository contains a snapshot,
not a live dependency.

Recommended wording:

```md
## Engine

Built with [WebGPU Research Engine](https://github.com/waynechoidev/webgpu-research-engine).
This repository contains the engine snapshot used during this project's
development.
```

When the source revision is known, record it:

```md
Engine snapshot: `<tag-or-commit>`
```

This is preferable to saying that the project “uses the latest engine,” because
a repository created from a GitHub template does not automatically receive
later upstream commits.

## Keep project and engine changes distinct

Project-specific rendering algorithms, shaders, data, and controls belong in
the project's module under `src/modules/`. Generic fixes that would benefit
unrelated projects may be contributed to the engine repository separately.

If engine code is modified inside the derived project, document any material
divergence from the recorded engine snapshot. Updating the engine later is an
explicit merge or porting task, not an automatic template operation.
