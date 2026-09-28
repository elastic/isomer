# Refund states, and where they are set

## Checkout, last 24 hours

| Region | Orders | p99 latency | Errors |
| - | - | - | - |
| Europe | 48,210 | 410 ms | 0.2% |
| North America | 61,905 | 380 ms | 0.1% |
| Asia Pacific | 22,764 | 1.9 s | 2.4% |

**refund.ts**

```ts
export const refund = async (order: Order) => {
  await ledger.write(order.id, -order.total);
  await fraud.check(order);
  return notify(order.customer);
};
```

_Crate · 03 Platform · [example.com/crate](https://example.com/crate)_