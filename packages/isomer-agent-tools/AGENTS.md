# Agent tools instructions

Read the [root instructions](../../AGENTS.md) first.

## Read before changing

- Definitions, result semantics, and capability availability: [Agent tools](docs/index.md) and [The tools](docs/index.md#the-tools).
- Host options, formats, or transport boundaries: [Options](docs/index.md#options), [Host formats](docs/index.md#host-formats), and [Adapters](docs/index.md#adapters).
- Validation or rendering: [Model output is untrusted](docs/index.md#model-output-is-untrusted) and [SDK composition checks](../isomer-sdk/docs/composition.md).

## When changing this area

Compare schemas, descriptions, and results with runtime capabilities. For guide changes, read [An index, then lookups](../isomer-sdk/docs/authoring.md#an-index-then-lookups): copy affects agent choices and cost.

## Evidence required

For boundary changes, exercise schemas and handlers with a runtime, covering affected invalid/refused inputs, thrown/reported failures, unavailable capabilities, or format encoding. For description/schema growth, check the existing tool-list, guide, or lookup byte budgets.

Run the module-graph check for dependency-boundary changes.
