import { prisma } from "@server/prisma";

interface CreateNotification {
  id: string;
  userId: string;
  body: string;
  href: string | null;
}

const notificationConsumers: Function[] = [
  // add notifcation consumers
];

export const createNotification = async (input: CreateNotification) => {
  const notification = await prisma.notification.create({
    data: {
      id: input.id,
      userId: input.userId,
      body: input.body,
      href: input.href,
    },
  });
  await Promise.all(
    notificationConsumers.map((consumer) => consumer(notification))
  );
  return notification;
};
