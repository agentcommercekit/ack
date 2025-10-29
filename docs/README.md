# Agent Commerce Kit (ACK) Documentation

This directory contains the source files for the official Agent Commerce Kit documentation, built using [Mintlify](https://mintlify.com/).

This includes:

- **ACK Documentation:** Detailed explanations of the concepts, protocols (ACK-ID and ACK-Pay), architecture, and operational considerations.
- **ACK Reference Implementation and Demos:** Examples showcasing ACK functionalities.

## Local Development

To preview documentation changes locally before committing, you can run Mintlify from the repository root (recommended) or directly from this (`docs`) directory.

### Preferred: Run from Repository Root

Navigate to the repository root in your terminal and run:

```sh
pnpm dev:docs
```

This will start a local server (usually at `http://localhost:3000`). If port `3000` is already in use, another port will be automatically selected.

### Alternative: Run from the Current (`docs`) Directory

#### 1. Install Mintlify CLI

If Mintlify CLI is not installed globally, run:

```sh
pnpm i -g mintlify
```

#### 2. Run the Development Server

From this (`docs`) directory, run:

```sh
pnpm run docs
```

This also launches the documentation preview locally at `http://localhost:3000`, or another port if `3000` is already in use.

## Publishing Changes

Updates to the live documentation site are made by project maintainers after reviewing and merging approved Pull Requests from community forks into the default branch (e.g., `main`). Direct pushes to the default branch are typically restricted.

## Contributing

We welcome contributions to the Agent Commerce Kit documentation and specifications! Whether you're fixing a typo, clarifying a concept, adding examples, or proposing larger changes, your input is valuable.

### Getting Started

1. **Discussions & Proposals:** For significant changes, new features, or protocol discussions, please **open an issue** on GitHub first to discuss your ideas with the maintainers and community. This helps ensure alignment before significant work is done.
2. **Bug Reports:** If you find an error in the documentation or specifications, please **open an issue** detailing the problem, the location, and suggested corrections if possible.

### Making Changes (Pull Request Workflow)

1. **Fork the Repository:** Create your own fork of the official ACK repository on GitHub.
2. **Create a Branch:** Create a new branch in your fork for your changes (e.g., `git checkout -b fix/typo-in-ack-id`).
3. **Make Your Changes:** Edit the relevant `.mdx` files or other source documents. Ensure your changes are clear and well-formatted.
4. **Test Locally:** Run the development server (`pnpm dev:docs` from root or `pnpm docs` from this directory) to preview your changes and ensure they render correctly without errors.
5. **Commit Your Changes:** Commit your changes with clear and concise commit messages.
6. **Push to Your Fork:** Push your feature branch to your fork on GitHub (e.g., `git push origin fix/typo-in-ack-id`).
7. **Submit a Pull Request (PR):** Open a Pull Request from your feature branch in your fork to the `main` branch of the official ACK repository.
   - Provide a clear title and description for your PR, explaining the purpose and scope of your changes.
   - Reference any related GitHub issues (e.g., "Closes #123").

8. **Review Process:** Maintainers will review your PR, provide feedback if necessary, and merge it once approved.

### Detailed Guidelines

For detailed contribution standards, the code of conduct, and the development setup, please refer to our full [CONTRIBUTING.md](../CONTRIBUTING.md) guide.

## Troubleshooting

- **Development server isn't running or shows errors:** Try running `pnpm install` from the root or this directory.
- **Page loads as 404:** Ensure the configuration file (`docs.json` or `mint.json`) correctly lists the page in the `navigation` section and that the corresponding `.mdx` file exists.
