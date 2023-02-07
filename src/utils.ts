import { Address, BigInt } from "@graphprotocol/graph-ts";
import { Swap } from "../generated/Router/RouterV2";
import {
  AccumulativeTokenBalance,
  Referral,
  GeneratedVolume,
  SwapLog,
  Lottery,
  UserLottery,
  AccumulativeGeneratedVolume,
  WeeklyGeneratedVolume,
} from "../generated/schema";
import { Dibs } from "../generated/Router/Dibs";
import { DibsLottery } from "../generated/Router/DibsLottery";
import { EACAggregatorProxy } from "../generated/Router/EACAggregatorProxy";

export const ZERO_ADDRESS = Address.fromHexString(
  "0x0000000000000000000000000000000000000000"
);
export const EPOCH_START_TIMESTAMP = BigInt.fromI32(1673481600);
export const EPOCH_LENGTH = BigInt.fromI32(604800);

export function getRound(timestamp: BigInt): BigInt {
  return timestamp.minus(EPOCH_START_TIMESTAMP).div(EPOCH_LENGTH);
}

export enum VolumeType {
  USER,
  PARENT,
  GRANDPARENT,
}

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
export function getOrCreateGeneratedVolume(user: Address): GeneratedVolume {
  let id = user.toHex();
  let generatedVolume = GeneratedVolume.load(id);
  if (generatedVolume == null) {
    generatedVolume = new GeneratedVolume(id);
    generatedVolume.user = user;
    generatedVolume.amountAsUser = BigInt.fromI32(0);
    generatedVolume.amountAsReferrer = BigInt.fromI32(0);
    generatedVolume.amountAsGrandparent = BigInt.fromI32(0);
  }
  return generatedVolume as GeneratedVolume;
}

export function getOrCreateAccumulativeGeneratedVolume(
  user: Address,
  timestamp: BigInt
): AccumulativeGeneratedVolume {
  let id = user.toHex() + "-" + timestamp.toString();
  let accumulativeGeneratedVolume = AccumulativeGeneratedVolume.load(id);
  if (accumulativeGeneratedVolume == null) {
    accumulativeGeneratedVolume = new AccumulativeGeneratedVolume(id);
    accumulativeGeneratedVolume.user = user;
    accumulativeGeneratedVolume.amountAsUser = BigInt.fromI32(0);
    accumulativeGeneratedVolume.amountAsReferrer = BigInt.fromI32(0);
    accumulativeGeneratedVolume.amountAsGrandparent = BigInt.fromI32(0);
    accumulativeGeneratedVolume.lastUpdate = timestamp;
  }
  return accumulativeGeneratedVolume as AccumulativeGeneratedVolume;
}

export function getOrCreateWeeklyGeneratedVolume(
  user: Address,
  epoch: BigInt
): WeeklyGeneratedVolume {
  let id = user.toHex() + "-" + epoch.toString();
  let weeklyGeneratedVolume = WeeklyGeneratedVolume.load(id);
  if (weeklyGeneratedVolume == null) {
    weeklyGeneratedVolume = new WeeklyGeneratedVolume(id);
    weeklyGeneratedVolume.user = user;
    weeklyGeneratedVolume.amountAsUser = BigInt.fromI32(0);
    weeklyGeneratedVolume.amountAsReferrer = BigInt.fromI32(0);
    weeklyGeneratedVolume.amountAsGrandparent = BigInt.fromI32(0);
    weeklyGeneratedVolume.epoch = epoch;
  }
  return weeklyGeneratedVolume;
}

export function updateVolume(
  user: Address,
  amount: BigInt,
  timestamp: BigInt,
  volumeType: VolumeType
): void {
  const generatedVolume = getOrCreateGeneratedVolume(user);
  const accGeneratedVolume = getOrCreateAccumulativeGeneratedVolume(
    user,
    timestamp
  );
  const accWeeklyGeneratedVolume = getOrCreateWeeklyGeneratedVolume(
    user,
    getRound(timestamp)
  );
  if (volumeType == VolumeType.USER) {
    generatedVolume.amountAsUser = generatedVolume.amountAsUser.plus(amount);
    accWeeklyGeneratedVolume.amountAsUser = accWeeklyGeneratedVolume.amountAsUser.plus(
      amount
    );
  } else if (volumeType == VolumeType.PARENT) {
    generatedVolume.amountAsReferrer = generatedVolume.amountAsReferrer.plus(
      amount
    );
    accWeeklyGeneratedVolume.amountAsReferrer = accWeeklyGeneratedVolume.amountAsReferrer.plus(
      amount
    );
  } else if (volumeType == VolumeType.GRANDPARENT) {
    generatedVolume.amountAsGrandparent = generatedVolume.amountAsGrandparent.plus(
      amount
    );
    accWeeklyGeneratedVolume.amountAsGrandparent = accWeeklyGeneratedVolume.amountAsGrandparent.plus(
      amount
    );
  }

  // set accGeneratedVolume fields from generated volume
  accGeneratedVolume.amountAsUser = generatedVolume.amountAsUser;
  accGeneratedVolume.amountAsReferrer = generatedVolume.amountAsReferrer;
  accGeneratedVolume.amountAsGrandparent = generatedVolume.amountAsGrandparent;

  // update timestamps
  accWeeklyGeneratedVolume.lastUpdate = timestamp;
  generatedVolume.lastUpdate = timestamp;
  accGeneratedVolume.lastUpdate = timestamp;

  generatedVolume.save();
  accGeneratedVolume.save();
  accWeeklyGeneratedVolume.save();
}

export function getOrCreateLottery(round: BigInt): Lottery {
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
export function getOrCreateUserLottery(
  round: BigInt,
  user: Address
): UserLottery {
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
  swap.stable = event.params.stable;
  swap.timestamp = event.block.timestamp;
  swap.save();
}

export function getBNBChainLink(): EACAggregatorProxy {
  return EACAggregatorProxy.bind(
    Address.fromString("0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE")
  );
}

export function getDIBS(): Dibs {
  return Dibs.bind(
    Address.fromString("0x664cE330511653cB2744b8eD50DbA31C6c4C08ca")
  );
}

export function getDIBSLottery(): DibsLottery {
  return DibsLottery.bind(
    Address.fromString("0x287ed50e4c158dac38e1b7e16c50cd1b2551a300")
  );
}

function e18(amount: BigInt): BigInt {
  const E18 = BigInt.fromI32(10).pow(18);
  return amount.times(E18);
}

export function getRewardPercentage(volume: BigInt): BigInt {
  if (volume <= e18(BigInt.fromString("30000"))) {
    return BigInt.fromI32(500);
  } else if (volume <= e18(BigInt.fromString("150000"))) {
    return BigInt.fromI32(650);
  } else if (volume <= e18(BigInt.fromString("1000000"))) {
    return BigInt.fromI32(800);
  } else if (volume <= e18(BigInt.fromString("10000000"))) {
    return BigInt.fromI32(1000);
  } else {
    return BigInt.fromI32(1200);
  }
}

export function getNumberOfTickets(volume: BigInt): BigInt {
  if (volume <= e18(BigInt.fromString("300"))) {
    return BigInt.fromI32(0);
  } else if (volume <= e18(BigInt.fromString("3000"))) {
    return BigInt.fromI32(2);
  } else if (volume <= e18(BigInt.fromString("30000"))) {
    return BigInt.fromI32(5);
  } else if (volume <= e18(BigInt.fromString("150000"))) {
    return BigInt.fromI32(10);
  } else {
    return BigInt.fromI32(15);
  }
}
