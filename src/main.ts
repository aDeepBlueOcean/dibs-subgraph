import { BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { PairFactory } from "../generated/Router/PairFactory";
import { ERC20 } from "../generated/Router/ERC20";
import {
  RouterV2,
  RouterV2__getAmountsOutInputRoutesStruct,
  Swap,
} from "../generated/Router/RouterV2";

import {
  ZERO_ADDRESS,
  addAccumulativeTokenBalance,
  getOrCreateGeneratedVolume,
  createReferral,
  createSwapLog,
  getDIBS,
  getOrCreateLottery,
  getOrCreateUserLottery,
  getDIBSLottery,
  getBNBChainLink,
  updateVolume,
  VolumeType,
  getRewardPercentage,
  getNumberOfTickets,
  getOrCreateWeeklyGeneratedVolume,
  getRoutes,
} from "./utils";

export function handleSwap(event: Swap): void {
  // extract swap params from event
  let token = event.params._tokenIn;
  let user = event.params.sender;
  let amount = event.params.amount0In;
  let timestamp = event.block.timestamp;

  let dibs = getDIBS();
  let inputToken = ERC20.bind(token);
  let dibsLottery = getDIBSLottery();
  let routerV2 = RouterV2.bind(event.address);
  let pairFactory = PairFactory.bind(routerV2.factory());
  let BNBChainLink = getBNBChainLink();

  let round = dibsLottery.getActiveLotteryRound();

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

  // get volume in BNB
  let volumeInBNB: BigInt;

  const precision = 4;

  if (token == routerV2.wETH()) {
    // if input token is wETH, no need to make conversions
    volumeInBNB = amount;
  } else {
    // in case input token is not wETH
    const unit = BigInt.fromI32(10).pow(u8(inputToken.decimals() - precision));
    let unitVolumeInBNB: BigInt;
    const routeToBNB = getRoutes(token, routerV2.wETH());
    if (routeToBNB.length > 0) {
      // if there is a rout from input token to wETH
      unitVolumeInBNB = routerV2
        .getAmountsOut(
          unit, // 0.0001 unit of the input token
          routeToBNB
        )
        .pop();
    } else {
      // no route to wETH
      unitVolumeInBNB = BigInt.fromI32(0);
    }
    volumeInBNB = unitVolumeInBNB.times(amount).div(unit); // time the amount of input token
  }

  let BNBPrice = BNBChainLink.latestAnswer();

  let volumeInDollars = BNBPrice.times(volumeInBNB).div(
    BigInt.fromI32(10).pow(8)
  );

  // update generated volume for user, parent and grandparent
  updateVolume(user, volumeInDollars, timestamp, VolumeType.USER);
  updateVolume(parentAddress, volumeInDollars, timestamp, VolumeType.PARENT);
  updateVolume(
    grandParentAddress,
    volumeInDollars,
    timestamp,
    VolumeType.GRANDPARENT
  );

  // calculate total amount of reward based on MAX_REFERRAL_FEE from pairFactory
  let feeRate = pairFactory.getFee(event.params.stable);
  let feeAmount = amount.times(feeRate).div(BigInt.fromI32(10000));
  let rewardPercentage = getRewardPercentage(
    getOrCreateGeneratedVolume(parentAddress).amountAsReferrer
  );
  let rewardAmount = feeAmount
    .times(rewardPercentage)
    .div(BigInt.fromI32(10000));

  // calculate the amount of tokens that the parent and grandparent and dibs platform will receive
  let scale = dibs.SCALE();
  let grandParentPercentage = dibs.grandparentPercentage();
  let dibsPercentage = dibs.dibsPercentage();
  let grandParentAmount = rewardAmount.times(grandParentPercentage).div(scale);
  let dibsAmount = rewardAmount.times(dibsPercentage).div(scale);
  let parentAmount = rewardAmount.minus(grandParentAmount.plus(dibsAmount));

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

  // create a referral if it does not exist
  createReferral(parentAddress, user);
  createSwapLog(event, round, volumeInBNB, BNBPrice, volumeInDollars);

  let lottery = getOrCreateLottery(round);
  let userLottery = getOrCreateUserLottery(round, user);
  let tickets = getNumberOfTickets(
    getOrCreateWeeklyGeneratedVolume(user, round).amountAsUser
  );

  if (tickets > userLottery.tickets) {
    userLottery.tickets = tickets;
    lottery.totalTikets = lottery.totalTikets.plus(tickets);
    userLottery.save();
    lottery.save();
  }
}
