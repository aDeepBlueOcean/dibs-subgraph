import { Address, BigInt } from "@graphprotocol/graph-ts";
import { Swap } from "../generated/TestRouter/TestRouter";
import {
  AccumulativeTokenBalance,
  Referral,
  GeneratedVolume,
  SwapLog,
  Lottery,
  UserLottery,
} from "../generated/schema";
import { Dibs } from "../generated/TestRouter/Dibs";
import { dataSource } from "@graphprotocol/graph-ts";
import { TestPairFactory } from "../generated/TestRouter/TestPairFactory";

export const ZERO_ADDRESS = Address.fromHexString(
  "0x0000000000000000000000000000000000000000"
);
export function addAccumulativeTokenBalance(
  token: Address,
  user: Address,
  amount: BigInt,
  timestamp: BigInt
): void {
  let id = token.toHex() + "-" + user.toHex();
  let accumulativeTokenBalance = AccumulativeTokenBalance.load(id);
  if (accumulativeTokenBalance == null) {
    accumulativeTokenBalance = new AccumulativeTokenBalance(id);
    accumulativeTokenBalance.token = token;
    accumulativeTokenBalance.user = user;
    accumulativeTokenBalance.amount = BigInt.fromI32(0);
  }
  accumulativeTokenBalance.amount = accumulativeTokenBalance.amount.plus(
    amount
  );
  accumulativeTokenBalance.lastUpdate = timestamp;
  accumulativeTokenBalance.save();
}
export function getOrCreateGeneratedVolume(
  token: Address,
  user: Address
): GeneratedVolume {
  let id = token.toHex() + "-" + user.toHex();
  let generatedVolume = GeneratedVolume.load(id);
  if (generatedVolume == null) {
    generatedVolume = new GeneratedVolume(id);
    generatedVolume.user = user;
    generatedVolume.token = token;
    generatedVolume.amountAsUser = BigInt.fromI32(0);
    generatedVolume.amountAsReferrer = BigInt.fromI32(0);
    generatedVolume.amountAsGrandparent = BigInt.fromI32(0);
  }
  return generatedVolume as GeneratedVolume;
}
function getOrCreateLottery(round: BigInt): Lottery {
  let id = round.toString();
  let lottery = Lottery.load(id);
  if (lottery == null) {
    lottery = new Lottery(id);
    lottery.round = round;
    lottery.totalTikets = BigInt.fromI32(0);
    lottery.save();
  }
  return lottery;
}
function getOrCreateUserLottery(round: BigInt, user: Address): UserLottery {
  let id = user.toHex() + "-" + round.toString();
  let userLottery = UserLottery.load(id);
  if (userLottery == null) {
    userLottery = new UserLottery(id);
    userLottery.user = user;
    userLottery.round = round;
    userLottery.tickets = BigInt.fromI32(0);
    userLottery.save();
  }
  return userLottery;
}
export function createReferral(referrer: Address, user: Address): void {
  let id = user.toHex() + "-" + referrer.toHex();
  let referral = Referral.load(id);
  if (referral == null) {
    referral = new Referral(id);
    referral.user = user;
    referral.referrer = referrer;
    referral.save();
  }
}
export function createSwapLog(event: Swap, lotteryRound: BigInt): void {
  // log the swap itself
  let swap = new SwapLog(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  );
  swap.txHash = event.transaction.hash;
  swap.logIndex = event.logIndex;
  swap.user = event.params.sender;
  swap.tokenIn = event.params._tokenIn;
  swap.amountIn = event.params.amount0In;
  swap.round = lotteryRound;
  swap.timestamp = event.block.timestamp;
  swap.save();
}

export function getDIBS(): Dibs {
  return Dibs.bind(
    Address.fromString("0x03fDbdcA199280dB975d213f663ef9D2D251D61f")
  );
}

export function getPairFactory(): TestPairFactory {
  return TestPairFactory.bind(
    Address.fromString("0xa7F1BCa1F071923Cd27535ba40C2E8D44f157420")
  );
}
