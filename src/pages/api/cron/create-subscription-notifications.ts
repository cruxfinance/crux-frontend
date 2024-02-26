import { Subscription, SubscriptionStatus } from "@prisma/client";
import { prisma } from "@server/prisma";
import { createNotification } from "@server/services/notification/notification";
import { getCurrentUpdatedSubcription } from "@server/services/subscription/subscription";
import { NextApiRequest, NextApiResponse } from "next";

interface SubscriptionNotificationFilterConfig {
  id: string;
  subscriptionStatus: SubscriptionStatus;
  expiryTimestampDifferenceSeconds: number | null;
  body: string;
  href: string | null;
}

const subscriptionNotificationFilter: SubscriptionNotificationFilterConfig[] = [
  {
    id: "payment_pending_notification",
    subscriptionStatus: SubscriptionStatus.PAYMENT_PENDING,
    expiryTimestampDifferenceSeconds: null,
    body: "Your subscription could not be renewed automatically. This could be due to insufficient balance in your payment instrument. Please add the required amount to your account to avoid any disruption.",
    href: "/user/payments",
  },
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const users = await prisma.user.findMany();
  const subscriptions = await Promise.all(
    users.map((user) => getCurrentUpdatedSubcription(user.id))
  );
  const notifications = subscriptions
    .map((subscription) => getFilteredNotifications(subscription))
    .reduce((a, c) => [...a, ...c], []);
  await Promise.all(
    notifications.map((notification) => {
      notification !== null &&
        createNotification(notification).catch((e) => console.error(e));
    })
  );
  const response = {
    cron: "createSubscriptionNotifications",
  };
  return res.status(200).json(response);
}

const getFilteredNotifications = (subscription: Subscription | null) => {
  if (subscription === null) {
    return [];
  }
  const notifications = subscriptionNotificationFilter
    .map((config) => {
      if (subscription.status !== config.subscriptionStatus) {
        return null;
      }
      // notification is created only if expiryDifference is more than config
      const expiryTimestampSeconds = Math.floor(
        (subscription.activationTimestamp?.getTime() ?? 0 / 1000) +
          subscription.periodSeconds
      );
      const now = Math.floor(new Date().getTime() / 1000);
      if (
        config.expiryTimestampDifferenceSeconds &&
        now - expiryTimestampSeconds <= config.expiryTimestampDifferenceSeconds
      ) {
        return null;
      }
      const notificationId = `${config.id}.${subscription.userId}.${
        subscription.activationTimestamp?.getTime() ?? "0"
      }`;
      return {
        id: notificationId,
        userId: subscription.userId,
        body: config.body,
        href: config.href,
      };
    })
    .filter((notification) => notification !== null);
  return notifications;
};
