import { UserPrivilegeLevel } from "@prisma/client";

export const PAYMENT_PENDING_ALLOWANCE = 3 * 24 * 60 * 60 * 1000; // 3 days

interface SubscriptionTokenConfig {
  tokenId: string | null;
  tokenDecimals: number;
}

const ERG_CONFIG = {
  tokenId: null,
  tokenDecimals: 9,
};

interface SubscriptionConfig {
  id: string;
  name: string;
  description?: string;
  subscriptionPeriodMonths: number;
  allowedPriviledgeLevel: UserPrivilegeLevel;
  amountUSD: number;
  discountedAmountUSD: number;
  allowedTokenIds: SubscriptionTokenConfig[];
}

export const SUBSCRIPTION_CONFIG: SubscriptionConfig[] = [
  // {
  //   id: "monthly_basic_plan",
  //   name: "Monthly Basic",
  //   subscriptionPeriodMonths: 1,
  //   allowedPriviledgeLevel: UserPrivilegeLevel.BASIC,
  //   amountUSD: 5.99,
  //   discountedAmountUSD: 4.89,
  //   allowedTokenIds: [ERG_CONFIG],
  // },
];
