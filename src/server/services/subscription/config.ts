import { UserPrivilegeLevel } from "@prisma/client";

interface SubscriptionTokenConfig {
  tokenId: string | null;
  tokenDecimals: number;
}

const ERG_CONFIG = {
  tokenId: null,
  tokenDecimals: 9,
};

interface SubscriptionConfig {
  name: string;
  description?: string;
  subscriptionPeriodMonths: number;
  allowedPriviledgeLevel: UserPrivilegeLevel;
  amountUSD: number;
  discountedAmountUSD: number;
  allowedTokenIds: SubscriptionTokenConfig[];
}

export const SubcriptionLevels: SubscriptionConfig[] = [
  {
    name: "Monthly Basic",
    subscriptionPeriodMonths: 1,
    allowedPriviledgeLevel: UserPrivilegeLevel.BASIC,
    amountUSD: 1.2,
    discountedAmountUSD: 1.0,
    allowedTokenIds: [ERG_CONFIG],
  },
];
