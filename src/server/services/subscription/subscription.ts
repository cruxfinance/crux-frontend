import { SubscriptionStatus, UserPrivilegeLevel } from "@prisma/client";
import { prisma } from "@server/prisma";
import { getTokenPriceInfo } from "@server/utils/tokenPrice";
import { PAYMENT_PENDING_ALLOWANCE, SUBSCRIPTION_CONFIG } from "./config";
import {
  chargePaymentInstrument,
  getPaymentInstrument,
} from "./paymentInstrument";

interface CreateSubscription {
  userId: string;
  paymentInstrumentId: string;
  subscriptionConfigId: string;
}

export const createSubscription = async (input: CreateSubscription) => {
  const subscriptionConfig = SUBSCRIPTION_CONFIG.find(
    (subscriptionConfig) => subscriptionConfig.id === input.subscriptionConfigId
  );
  if (!subscriptionConfig) {
    throw new Error(
      `Invalid SubcriptionConfig id ${input.subscriptionConfigId}.`
    );
  }
  const paymentInstrument = await getPaymentInstrument(
    input.paymentInstrumentId
  );
  const allowedTokenConfig = subscriptionConfig.allowedTokenIds.find(
    (config) => config.tokenId === paymentInstrument.tokenId
  );
  if (!allowedTokenConfig) {
    throw new Error(
      `PaymentInstrument ${input.paymentInstrumentId} cannot be used for subcription ${subscriptionConfig.id}: Unsupported token.`
    );
  }
  const subscription = await prisma.subscription.create({
    data: {
      userId: input.userId,
      paymentInstrumentId: input.paymentInstrumentId,
      requiredAmountUSD: Math.floor(
        subscriptionConfig.discountedAmountUSD * 100
      ),
      allowedAccess: subscriptionConfig.allowedPriviledgeLevel,
      periodSeconds:
        subscriptionConfig.subscriptionPeriodMonths * 30 * 24 * 60 * 60,
      subscriptionType: input.subscriptionConfigId
    },
  });
  return subscription;
};

export const getSubscription = async (subscriptionId: string) => {
  const subscription = await prisma.subscription.findFirst({
    where: {
      id: subscriptionId,
    },
  });
  if (subscription === null) {
    throw new Error(`Subscription not found ${subscriptionId}.`);
  }
  const now = new Date().getTime();
  const expiryTimestamp = subscription.activationTimestamp
    ? subscription.activationTimestamp.getTime() +
    subscription.periodSeconds * 1000
    : subscription.createdAt.getTime();
  if (now > expiryTimestamp + PAYMENT_PENDING_ALLOWANCE) {
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        ...subscription,
        status: SubscriptionStatus.EXPIRED,
        updatedAt: new Date(),
      },
    });
    return updatedSubscription;
  } else if (now > expiryTimestamp) {
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        ...subscription,
        status: SubscriptionStatus.PAYMENT_PENDING,
        updatedAt: new Date(),
      },
    });
    return updatedSubscription;
  }
  return subscription;
};

export const renewSubscription = async (subcriptionId: string) => {
  const subcription = await getSubscription(subcriptionId);
  if (subcription.status === SubscriptionStatus.ACTIVE) {
    throw new Error(`Subscription ${subcriptionId} is already active.`);
  }
  const paymentInstrument = await getPaymentInstrument(
    subcription.paymentInstrumentId
  );
  const tokenPriceInfo = await getTokenPriceInfo(paymentInstrument.tokenId);
  const amountToCharge = Math.floor(
    (Number(subcription.requiredAmountUSD) / tokenPriceInfo.tokenPrice) *
    Math.pow(10, tokenPriceInfo.tokenDecimals - 2) // USD decimal adjustment
  );
  const now = Math.floor(new Date().getTime() / (10 * 60 * 1000));
  const charge = await chargePaymentInstrument({
    paymentInstrumentId: paymentInstrument.id,
    tokenId: paymentInstrument.tokenId,
    amount: amountToCharge,
    idempotencyKey: `${subcriptionId}.renew.${now}`,
  });
  const updatedSubscription = await prisma.subscription.update({
    where: { id: subcriptionId },
    data: {
      ...subcription,
      status: SubscriptionStatus.ACTIVE,
      activationTimestamp: new Date(),
      updatedAt: new Date(),
    },
  });
  return {
    subcription: updatedSubscription,
    charge: charge.charge,
  };
};

export const findSubscriptions = async (userId: string) => {
  const subscriptionIds = (
    await prisma.subscription.findMany({
      where: {
        userId: userId,
      },
    })
  ).map((subcription) => subcription.id);
  const subscriptions = await Promise.all(
    subscriptionIds.map((subscriptionId) => getSubscription(subscriptionId))
  );
  return subscriptions;
};

export const getCurrentUpdatedSubcription = async (userId: string) => {
  const subscriptions = await findSubscriptions(userId);
  // get last updated subscription
  const activeSubscription =
    [...subscriptions].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    )[0] ?? null;
  if (activeSubscription === null) {
    // noop if no subscription
    await prisma.user.update({
      where: { id: userId },
      data: { privilegeLevel: UserPrivilegeLevel.DEFAULT },
    });
    return null;
  }
  if (activeSubscription.status !== SubscriptionStatus.ACTIVE) {
    try {
      // try auto charging subscription
      await renewSubscription(activeSubscription.id);
      activeSubscription.status = SubscriptionStatus.ACTIVE;
    } catch (e) {
      // could not renew the subscription
      console.warn(e);
    }
  }
  // if expired or the subscription has never been activated
  if (
    activeSubscription.status === SubscriptionStatus.EXPIRED ||
    (activeSubscription.activationTimestamp === null &&
      activeSubscription.status === SubscriptionStatus.PAYMENT_PENDING)
  ) {
    await prisma.user.update({
      where: { id: userId },
      data: { privilegeLevel: UserPrivilegeLevel.DEFAULT },
    });
    // we might have updated the subscription so get the latest object
    return await getSubscription(activeSubscription.id);
  }
  await prisma.user.update({
    where: { id: userId },
    data: { privilegeLevel: activeSubscription.allowedAccess },
  });
  // need the latest data
  return await getSubscription(activeSubscription.id);
};

interface UpdateSubscription {
  activeSubscriptionId: string;
  paymentInstrumentId: string;
  updateSubscriptionConfigId: string;
}

export const getSubscriptionUpdateParams = async (
  input: UpdateSubscription
) => {
  // we need to calculate the amount of charge required for the update
  // if the current subscription amount is 1.99 and the updated subscription amount is 3.49
  // we need to charge the remainder amount before updating the subscription
  const updateConfig = SUBSCRIPTION_CONFIG.filter(
    (config) => config.id === input.updateSubscriptionConfigId
  )[0];
  if (!updateConfig) {
    throw new Error(
      `Invalid SubcriptionConfig id ${input.updateSubscriptionConfigId}.`
    );
  }
  const activeSubscription = await getSubscription(input.activeSubscriptionId);
  // amount charged when subscription was activated
  const totalChargedAmountUSD =
    activeSubscription.status === SubscriptionStatus.ACTIVE
      ? Number(activeSubscription.requiredAmountUSD)
      : 0;
  const secondsElaspedAfterActivation = activeSubscription.activationTimestamp
    ? (new Date().getTime() -
      activeSubscription.activationTimestamp.getTime()) /
    1000
    : Math.max();
  // amount of total charge that has been consumed
  const consumedAmountUSD = Math.min(
    totalChargedAmountUSD,
    Math.floor(
      totalChargedAmountUSD *
      (secondsElaspedAfterActivation / activeSubscription.periodSeconds)
    )
  );
  // amount left to consume
  const refundAmountUSD = Math.max(
    0,
    totalChargedAmountUSD - consumedAmountUSD
  );
  // amount required for new plan
  const requiredAmountUSD = updateConfig.discountedAmountUSD * 100;
  // difference amount to charge now
  const diff = Math.max(0, requiredAmountUSD - refundAmountUSD);
  return {
    updateConfig: updateConfig,
    activeSubscription: activeSubscription,
    amountUSD: diff,
  };
};

export const updateSubscription = async (input: UpdateSubscription) => {
  const updateChargeParams = await getSubscriptionUpdateParams(input);
  const activeSubscription = updateChargeParams.activeSubscription;
  const updateConfig = updateChargeParams.updateConfig;
  const paymentInstrument = await getPaymentInstrument(
    input.paymentInstrumentId
  );
  const allowedTokenConfig = updateConfig.allowedTokenIds.find(
    (config) => config.tokenId === paymentInstrument.tokenId
  );
  if (!allowedTokenConfig) {
    throw new Error(
      `PaymentInstrument ${input.paymentInstrumentId} cannot be used for subcription ${updateConfig.id}: Unsupported token.`
    );
  }
  const tokenPriceInfo = await getTokenPriceInfo(paymentInstrument.tokenId);
  const amountToCharge = Math.floor(
    (Number(updateChargeParams.amountUSD) / tokenPriceInfo.tokenPrice) *
    Math.pow(10, tokenPriceInfo.tokenDecimals - 2) // USD decimal adjustment
  );
  const now = Math.floor(new Date().getTime() / (10 * 60 * 1000));
  const charge = await chargePaymentInstrument({
    paymentInstrumentId: paymentInstrument.id,
    amount: amountToCharge,
    tokenId: paymentInstrument.tokenId,
    idempotencyKey: `${activeSubscription.id}.update.${now}`,
  });
  const updatedSubscription = await prisma.subscription.update({
    where: {
      id: activeSubscription.id,
    },
    data: {
      ...activeSubscription,
      paymentInstrumentId: paymentInstrument.id,
      requiredAmountUSD: updateConfig.discountedAmountUSD * 100,
      allowedAccess: updateConfig.allowedPriviledgeLevel,
      periodSeconds: updateConfig.subscriptionPeriodMonths * 30 * 24 * 60 * 60,
      status: SubscriptionStatus.ACTIVE,
      activationTimestamp: new Date(),
      updatedAt: new Date(),
      subscriptionType: input.updateSubscriptionConfigId
    },
  });
  return {
    subscription: updatedSubscription,
    charge: charge,
  };
};
