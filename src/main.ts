import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import { Swap } from "../generated/TestRouter/TestRouter";

import {
  ZERO_ADDRESS,
  addAccumulativeTokenBalance,
  getOrCreateGeneratedVolume,
  createReferral,
  createSwapLog,
  getDIBS,
  getPairFactory,
} from "./utils";

export function handleSwap(event: Swap): void {
  // extract swap params from event
  let token = event.params._tokenIn;
  let user = event.params.sender;
  let amount = event.params.amount0In;
  let timestamp = event.block.timestamp;

  let dibs = getDIBS();
  let pairFactory = getPairFactory();

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
