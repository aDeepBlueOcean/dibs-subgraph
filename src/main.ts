import { BigInt } from "@graphprotocol/graph-ts";
import { Swap } from "../generated/templates/PairReader/Pair";

import { SwapHandler } from "./SolidlySwapHandler";

export function handleSwap(event: Swap): void {
  if (event.block.number.lt(BigInt.fromI64(25238657))) {
    return;
  }
  const handler = new SwapHandler(event);
  handler.handle();
}
