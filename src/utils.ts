import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts"
import {
  Referral,
  GeneratedVolume,
  DailyGeneratedVolume,
  DailyPerPairGeneratedVolume,
} from "../generated/schema"



export const zero_address = Address.fromHexString(
  "0x0000000000000000000000000000000000000000"
)

export function getDay(timestamp: BigInt): BigInt {
  return timestamp.div(BigInt.fromI32(86400))
}

export enum VolumeType {
  USER,
  PARENT,
  GRANDPARENT
}

export function getOrCreateGeneratedVolume(
  user: Address,
  pair: Address
): GeneratedVolume {
  let id = user.toHex() + "-" + pair.toHex()
  let generatedVolume = GeneratedVolume.load(id)
  if (generatedVolume == null) {
    generatedVolume = new GeneratedVolume(id)
    generatedVolume.user = user
    generatedVolume.amountAsUser = BigInt.fromI32(0)
    generatedVolume.amountAsReferrer = BigInt.fromI32(0)
    generatedVolume.amountAsGrandparent = BigInt.fromI32(0)
  }
  return generatedVolume as GeneratedVolume
}


export function getOrCreateDailyGeneratedVolume(
  user: Address,
  day: BigInt,
  pair: Address
): DailyGeneratedVolume {
  let id = user.toHex() + "-" + day.toString() + "-" + pair.toHex()
  let dailyGeneratedVolume = DailyGeneratedVolume.load(id)
  if (dailyGeneratedVolume == null) {
    dailyGeneratedVolume = new DailyGeneratedVolume(id)
    dailyGeneratedVolume.user = user
    dailyGeneratedVolume.amountAsUser = BigInt.fromI32(0)
    dailyGeneratedVolume.amountAsReferrer = BigInt.fromI32(0)
    dailyGeneratedVolume.amountAsGrandparent = BigInt.fromI32(0)
    dailyGeneratedVolume.day = day
  }
  return dailyGeneratedVolume
}

export function getOrCreateDailyPerPairVolume(
  user: Address,
  pair: Address,
  day: BigInt
): DailyPerPairGeneratedVolume {
  let id = user.toHex() + "-" + pair.toHex() + "-" + day.toHex()
  let dailyPerPairGeneratedVolume = DailyPerPairGeneratedVolume.load(id)
  if(dailyPerPairGeneratedVolume == null){
    dailyPerPairGeneratedVolume = new DailyPerPairGeneratedVolume(id)
    dailyPerPairGeneratedVolume.user = user
    dailyPerPairGeneratedVolume.pair = pair
    dailyPerPairGeneratedVolume.amountAsUser = BigInt.fromI32(0)
    dailyPerPairGeneratedVolume.amountAsReferrer = BigInt.fromI32(0)
    dailyPerPairGeneratedVolume.amountAsGrandparent = BigInt.fromI32(0)
    dailyPerPairGeneratedVolume.day = day
  }
  return dailyPerPairGeneratedVolume
}


export function updateVolume(
  user: Address,
  amount: BigInt,
  timestamp: BigInt,
  pair: Address,
  volumeType: VolumeType
): void {
  const generatedVolume = getOrCreateGeneratedVolume(user, pair)
  
  const accDailyGeneratedVolume = getOrCreateDailyGeneratedVolume(
    user,
    getDay(timestamp),
    pair
  )
  if (volumeType == VolumeType.USER) {
    generatedVolume.amountAsUser = generatedVolume.amountAsUser.plus(amount)
  
    accDailyGeneratedVolume.amountAsUser = accDailyGeneratedVolume.amountAsUser.plus(
      amount
    )
  } else if (volumeType == VolumeType.PARENT) {
    generatedVolume.amountAsReferrer = generatedVolume.amountAsReferrer.plus(
      amount
    )
   
    accDailyGeneratedVolume.amountAsReferrer = accDailyGeneratedVolume.amountAsReferrer.plus(
      amount
    )
  } else if (volumeType == VolumeType.GRANDPARENT) {
    generatedVolume.amountAsGrandparent = generatedVolume.amountAsGrandparent.plus(
      amount
    )
   
    accDailyGeneratedVolume.amountAsGrandparent = accDailyGeneratedVolume.amountAsGrandparent.plus(
      amount
    )
  }

  // update timestamps
  generatedVolume.lastUpdate = timestamp
  accDailyGeneratedVolume.lastUpdate = timestamp

  generatedVolume.save()
  accDailyGeneratedVolume.save()
}

export function updateDailyPerPairVolume(
  user: Address,
  pair_: Address,
  amount: BigInt,
  timestamp: BigInt,
  volumeType: VolumeType
): void {
  const generatedVolume = getOrCreateDailyPerPairVolume(user, pair_, getDay(timestamp))

  if (volumeType == VolumeType.USER) {
    generatedVolume.amountAsUser = generatedVolume.amountAsUser.plus(amount)
    
  } else if (volumeType == VolumeType.PARENT) {
    generatedVolume.amountAsReferrer = generatedVolume.amountAsReferrer.plus(
      amount
    )
    
  } else if (volumeType == VolumeType.GRANDPARENT) {
    generatedVolume.amountAsGrandparent = generatedVolume.amountAsGrandparent.plus(
      amount
    )
  
  }
}

export function createReferral(referrer: Address, user: Address): void {
  let id = user.toHex() + "-" + referrer.toHex()
  let referral = Referral.load(id)
  if (referral == null) {
    referral = new Referral(id)
    referral.user = user
    referral.referrer = referrer
    referral.save()
  }
}
