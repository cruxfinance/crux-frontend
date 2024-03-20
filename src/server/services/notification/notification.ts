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

export const getNotification = async (notificationId: string) => {
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
    },
  });
  if (notification === null) {
    throw new Error(`Notification ${notificationId} not found.`);
  }
  return notification;
};

export const getNotifications = async (userId: string) => {
  const notifications = await prisma.notification.findMany({
    where: {
      userId: userId,
    },
  });
  return notifications;
};

export const markNotifcationAsRead = async (notificationId: string) => {
  const notification = await getNotification(notificationId);
  const update = await prisma.notification.update({
    where: {
      id: notificationId,
    },
    data: {
      ...notification,
      read: !notification.read,
      updatedAt: new Date(),
    },
  });
  return update;
};

export const markAllAsRead = async (userId: string) => {
  const update = await prisma.notification.updateMany({
    where: {
      userId: userId,
    },
    data: {
      read: true,
      updatedAt: new Date(),
    },
  });
  return update;
};
