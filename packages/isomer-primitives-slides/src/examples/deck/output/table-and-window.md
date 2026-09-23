# Table and window

## 07 · Surfaces

### On invalid input

| Surface | Behavior |
| --- | --- |
| react | Never validates |
| html | Reports findings |
| text | Throws |
| slack | Throws |

**node render.js**

```ts
const runtime = createIsomerRuntime({
  packs: [slidesPack],
});
```