# GitHub Pages Deployment

The repository includes `.github/workflows/deploy-pages.yml`. It runs the
tests, creates a production Vite build, uploads `dist`, and deploys it to
GitHub Pages whenever `main` is pushed. It can also be started manually.

## Repository settings

Configure the publishing source once for each repository:

1. Open the repository on GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.

Verify that the repository permits the actions used by the workflow:

1. Go to **Settings → Actions → General**.
2. Under **Actions permissions**, allow GitHub Actions to run. When actions are
   restricted, permit the official `actions/*` actions used by the workflow.
3. Under **Workflow permissions**, the restricted
   **Read repository contents and packages permissions** setting is sufficient.

The workflow requests only the permissions needed for deployment:

```yaml
permissions:
  contents: read
  pages: write
  id-token: write
```

The repository does not need the global **Read and write permissions** option.
The `github-pages` deployment environment is created automatically if it does
not already exist.

## Deploy

Push a commit to `main`:

```bash
git push origin main
```

Alternatively, open **Actions → Deploy to GitHub Pages**, select **Run
workflow**, and run it from `main`.

The workflow uses the repository name as the Vite base path:

```text
BASE_PATH=/<repository-name>/
```

This makes project-site assets resolve correctly at:

```text
https://<account>.github.io/<repository-name>/
```

The deployed sample for this repository is:

<https://waynechoidev.github.io/webgpu-research-engine/>

## Troubleshooting

- If Pages reports that no publishing source is configured, select
  **GitHub Actions** under **Settings → Pages**.
- If an action is blocked, update **Settings → Actions → General** to permit
  the official `actions/*` actions referenced by the workflow.
- If deployment permission is denied, confirm that the workflow still declares
  `pages: write` and `id-token: write`.
- If JavaScript or shader assets return 404, confirm that the build received
  `BASE_PATH=/<repository-name>/`.
- Check the **Actions** run first: the test, build, artifact upload, and deploy
  jobs report failures separately.
