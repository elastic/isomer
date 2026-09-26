# Three ways to ship a release

## Canary

`1%` `10%` `50%`

A slice of traffic takes the new build first, so a bad release hurts few customers.

## Blue-green

`blue` `green`

Two full fleets. The switch is instant, and so is the way back.

## Rolling

`zone-a` `zone-b` `zone-c` `zone-d`

One zone at a time, with no spare capacity to pay for.

`auto-rollback` returns any of the three to the last healthy build.

_Crate · 03 Platform · [example.com/crate](https://example.com/crate)_