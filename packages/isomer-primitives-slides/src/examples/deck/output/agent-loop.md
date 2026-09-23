# Agent loop

## 06 · Agents

## Parse, then retry.

### Loop

**Until it parses:** Context -> Model -> parse -> Errors -> Context

**Agent**

**User**

How is checkout doing?

**Model**

```text
{ "type": "slideTitle" }
```

**Host**

```text
body[0].title: expected string
```

**Model**

Retried with a title.