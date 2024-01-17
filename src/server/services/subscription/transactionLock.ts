import { prisma } from "@server/prisma";
import { v4 as uuidv4 } from "uuid";

const createTransactionalLockIfRequired = async (id: string) => {
  const lock = await prisma.transactionalLock.findFirst({
    where: { id },
  });
  if (lock === null) {
    const lock = await prisma.transactionalLock.create({
      data: {
        id: id,
      },
    });
    return lock;
  }
  return lock;
};

const DEFAULT_LEASE = 60 * 1000; // 1 min

export const acquireTransactionalLock = async (id: string) => {
  // create the lock if required
  await createTransactionalLockIfRequired(id);

  // try to make a conditional update on the lock
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

  // if the the update is successful, we have the lock. woohoo!!!
  if (acquired.count >= 1) {
    return lock;
  }

  // in case of a bad process we do not want the lock to be held forever
  // so release locks automatically if the lease has expired
  const transactionalLock = await prisma.transactionalLock.findFirst({
    where: { id },
  });
  // ugly trick to avoid a null check
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

  // throw an error
  throw new Error(`Could not acquire TransactionalLock ${id}.`);
};

export const releaseTransactionalLock = async (id: string, lock: string) => {
  // release the lock if we have it
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
  // return true anyway as if doesn't matter if
  // the lock was already released or not held by us
  return true;
};
