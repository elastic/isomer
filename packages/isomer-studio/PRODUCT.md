# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences, equally.

- **Pack authors.** Teams writing primitives for a host such as Kibana. They browse a pack's primitives, edit examples, and check how each one renders and validates.
- **Engineers evaluating Isomer.** People deciding whether to adopt it. They browse the catalog and see one composition render on every surface.

## Product Purpose

Isomer Studio is a browser app, run by the `isomer-studio` CLI over a consumer's `isomer-studio.config.ts`, for browsing and checking everything a runtime reports: its primitives, examples, compositions and apps.
It exists so that what a pack does is visible and verifiable before a host ships it.

## Positioning

One typed `Composition` rendered on every surface (React, HTML, PNG, Slack Block Kit, Markdown and plain text) side by side, edited live against the host's own pack, with validation as you type.
Both halves are the claim: editing live is how you see one composition across every surface.

## Operating Context

- It builds only from what a runtime reports. The consumer's config supplies the runtime, packs, apps and featured primitives; the Studio holds no data of its own.
- It ships as a dev server (`dev`) or a static site (`build`), and the browser app is prebuilt.
- Hosts own data, authorization and routing. The Studio is not a host application.

## Capabilities and Constraints

- Pages: Home, Reference (per-primitive docs and examples), Workbench (edit one example beside its outputs), the composition editor, a Gallery of every example, and apps that a config adds (the slides pack adds Decks).
- Outputs the runtime cannot render, such as PNG or PDF without an image backend, are absent rather than faked.
- Isomer's contract stays in the SDK and runtime. The Studio adapts and does not redefine it.

## Brand Commitments

Elastic-adjacent: it is built with EUI and sits alongside Elastic's products, but it is not constrained to match Elastic. Where the product is better served by departing from EUI defaults, it may.

## Evidence on Hand

Package docs describe the Studio in `docs/`, with screenshots of Home, Reference, the Workbench and the composition editor in `docs/images/`.
There are no customer quotes, usage numbers or benchmarks, and none should be written.

## Product Principles

1. Show the same composition everywhere. Every surface a runtime renders is one click from the others, and the Workbench can show several side by side; HTML, React and Snapshot share one Web panel with a switch.
2. Make it live and checked. Edits render and validate as you type, so a problem shows where it is introduced.
3. Report what the runtime reports. The Studio does not hide, fake or add primitives, outputs or apps.
4. Elastic-adjacent, not Elastic-bound. Use EUI where it serves, and depart where it does not.
