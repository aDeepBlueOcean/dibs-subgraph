import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import { TestRouter, Swap } from "../generated/TestRouter/TestRouter";
import {
  AccumulativeTokenBalance,
  Referral,
  GeneratedVolume,
  SwapLog,
} from "../generated/schema";

import { Dibs } from "../generated/TestRouter/Dibs";
import { TestPairFactory } from "../generated/TestRouter/TestPairFactory";

const ZERO_ADDRESS = Address.fromHexString(
  "0x0000000000000000000000000000000000000000"
);

function addAccumulativeTokenBalance(
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

function getOrCreateGeneratedVolume(
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

function createReferral(referrer: Address, user: Address): void {
  let id = user.toHex() + "-" + referrer.toHex();
  let referral = Referral.load(id);
  if (referral == null) {
    referral = new Referral(id);
    referral.user = user;
    referral.referrer = referrer;
    referral.save();
  }
}

function createSwapLog(event: Swap, lotteryRound: BigInt): void {
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

export function handleSwap(event: Swap): void {
  // extract swap params from event
  let token = event.params._tokenIn;
  let user = event.params.sender;
  let amount = event.params.amount0In;
  let timestamp = event.block.timestamp;

  let dibs = Dibs.bind(
    Address.fromString("0x03fDbdcA199280dB975d213f663ef9D2D251D61f")
  );
  let pairFactory = TestPairFactory.bind(
    Address.fromString("0xa7F1BCa1F071923Cd27535ba40C2E8D44f157420")
  );

  let round = dibs.getActiveLotteryRound();

  // check if user is registered in the dibs contracts
  // if not registered then return
  let userCode = dibs.addressToCode(user);
  if (userCode == Bytes.empty()) {
    return;
  }

  // since all registered users have a parent,
  // we can get the parent and grandparent address
  let parentAddress = dibs.parents(user);
  let grandParentAddress = dibs.parents(parentAddress);
  // if the grandparent address is address 0x0, set grandparent address to dibs address

  if (parentAddress == ZERO_ADDRESS) {
    return;
  }

  if (grandParentAddress == ZERO_ADDRESS) {
    grandParentAddress = dibs.codeToAddress(dibs.DIBS());
  }
  // calculate total amount of reward based on MAX_REFERRAL_FEE from pairFactory
  let rewardPercentage = pairFactory.MAX_REFERRAL_FEE();
  let rewardAmount = amount.times(rewardPercentage).div(BigInt.fromI32(10000));
  // calculate the amount of tokens that the parent and grandparent and dibs platform will receive
  let scale = dibs.SCALE();
  let grandParentPercentage = dibs.grandparentPercentage();
  let dibsPercentage = dibs.dibsPercentage();
  let grandParentAmount = rewardAmount.times(grandParentPercentage).div(scale);
  let dibsAmount = rewardAmount.times(dibsPercentage).div(scale);
  let parentAmount = rewardAmount.minus(grandParentAmount).minus(dibsAmount);
  // add the reward amount to the accumulative token balance for the parent, grandparent and dibs platform
  addAccumulativeTokenBalance(token, parentAddress, parentAmount, timestamp);
  addAccumulativeTokenBalance(
    token,
    grandParentAddress,
    grandParentAmount,
    timestamp
  );
  addAccumulativeTokenBalance(
    token,
    dibs.codeToAddress(dibs.DIBS()),
    dibsAmount,
    timestamp
  );
  // add the amount of tokens that the user has generated to the generated volume
  let generatedVolume = getOrCreateGeneratedVolume(token, user);
  generatedVolume.amountAsUser = generatedVolume.amountAsUser.plus(amount);
  generatedVolume.lastUpdate = timestamp;
  generatedVolume.save();
  // add the amount of tokens that the parent has generated to the generated volume
  let parentGeneratedVolume = getOrCreateGeneratedVolume(token, parentAddress);
  parentGeneratedVolume.amountAsReferrer = parentGeneratedVolume.amountAsReferrer.plus(
    amount
  );
  parentGeneratedVolume.lastUpdate = timestamp;
  parentGeneratedVolume.save();
  // add the amount of tokens that the grandparent has generated to the generated volume
  let grandParentGeneratedVolume = getOrCreateGeneratedVolume(
    token,
    grandParentAddress
  );
  grandParentGeneratedVolume.amountAsGrandparent = grandParentGeneratedVolume.amountAsGrandparent.plus(
    amount
  );
  grandParentGeneratedVolume.lastUpdate = timestamp;
  grandParentGeneratedVolume.save();
  // create a referral if it does not exist
  createReferral(parentAddress, user);
  createSwapLog(event, round);
}
