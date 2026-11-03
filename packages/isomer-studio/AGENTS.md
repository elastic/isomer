# Studio instructions

Read the [root instructions](../../AGENTS.md) first.

## Read before changing

- CLI behavior, hot updates, or output panels: [Commands](docs/commands.md), including [Comparing outputs](docs/commands.md#comparing-outputs).
- Config loading, composition hooks, or React identity: [Config](docs/config.md), especially [How the config loads](docs/config.md#how-the-config-loads) and [One React](docs/config.md#one-react).
- Build or gate behavior: [Static sites](docs/commands.md#static-sites), [Check](docs/commands.md#check), and [CI](docs/ci.md).

## When changing this area

Trace affected config, CLI, Node, browser-model, and output paths; include a non-slides consumer when pack assumptions are at issue.

For editor changes, check affected draft-retention transitions and stale compilation/PNG results. For lifecycle changes, check resources the change could affect across updates and unmounts.

## Evidence required

For browser behavior changes, use `e2e/studio.spec.ts` and `pnpm test:browser` for affected editing, navigation, hot-update, recovery, or dev/static states.

For config resolution, dependencies, assets, binary entry, or packaging changes, run `pnpm check:studio-consumer`. Build prerequisites are in [Contributing](../../CONTRIBUTING.md#development).
