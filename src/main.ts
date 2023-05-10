import { Swap } from "../generated/templates/PairReader/Pair";

import { SwapHandler } from "./SolidlySwapHandler";

export function handleSwap(event: Swap): void {
  const handler = new SwapHandler(event);
  handler.handle();
}
