import { prisma } from "@server/prisma";
import { v4 as uuidv4 } from "uuid";

export const createTransactionalLock = async (id: string) => {
  const lock = await prisma.transactionalLock.create({
    data: {
      id: id,
    },
  });
  return lock;
};

const DEFAULT_LEASE = 60 * 1000; // 1 min

export const acquireTransactionalLock = async (id: string) => {
  const lock = uuidv4();
  const acquired = await prisma.transactionalLock.updateMany({
    where: {
      id,
      lock: null,
    },
    data: {
      id,
      lock,
      lease: new Date(Date.now() + DEFAULT_LEASE),
    },
  });
  if (acquired.count >= 1) {
    return lock;
  }
  const transactionalLock = await prisma.transactionalLock.findFirst({
    where: { id },
  });
  if ((transactionalLock?.lease?.getTime() ?? Date.now() + 1000) < Date.now()) {
    await prisma.transactionalLock.updateMany({
      where: { id },
      data: {
        id,
        lock: null,
        lease: null,
      },
    });
  }
  throw new Error(`Could not acquire TransactionalLock ${id}.`);
};

export const releaseTransactionalLock = async (id: string, lock: string) => {
  await prisma.transactionalLock.updateMany({
    where: {
      id,
      lock: lock,
    },
    data: {
      id,
      lock: null,
      lease: null,
    },
  });
  return true;
};
