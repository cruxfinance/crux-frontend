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

export interface SubscriptionConfig {
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
  {
    id: "monthly_basic_plan_erg",
    name: "Monthly Basic - ERG",
    subscriptionPeriodMonths: 1,
    allowedPriviledgeLevel: UserPrivilegeLevel.BASIC,
    description: "Basic subscription plan charged monthly.",
    amountUSD: 1.99,
    discountedAmountUSD: 1.99,
    allowedTokenIds: [ERG_CONFIG],
  },
  {
    id: "monthly_basic_plan_crux",
    name: "Monthly Basic - CRUX",
    subscriptionPeriodMonths: 1,
    allowedPriviledgeLevel: UserPrivilegeLevel.BASIC,
    description:
      "Basic subscription plan charged monthly. Special disounted rate for using CRUX tokens.",
    amountUSD: 1.99,
    discountedAmountUSD: 1.49,
    allowedTokenIds: [
      {
        tokenId:
          "00b42b41cb438c41d0139aa8432eb5eeb70d5a02d3df891f880d5fe08670c365",
        tokenDecimals: 4,
      },
    ],
  },
];
