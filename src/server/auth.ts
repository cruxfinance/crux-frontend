import { Address, verify_signature } from "ergo-lib-wasm-nodejs";
import { NextApiRequest, NextApiResponse } from "next";
import { RequestInternal, Session, User } from "next-auth";
import { ProviderType } from "next-auth/providers/index";
import {
  JWTDecodeParams,
  JWTEncodeParams,
  decode,
  encode,
} from "next-auth/jwt";
import { getCookie, setCookie } from "cookies-next";
import { nanoid } from "nanoid";
import { prisma } from "@server/prisma";

/**
 * Module augmentation for `next-auth` types.
 * Allows us to add custom properties to the `session` object and keep type
 * safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 **/
declare module "next-auth" {
  interface Account {
    id: string;
    userId?: string;
    type: ProviderType;
    provider: string;
    providerAccountId: string;
    refreshToken?: string | null;
    accessToken?: string | null;
    expiresAt?: number | null;
    tokenType?: string | null;
    scope?: string | null;
    idToken?: string | null;
    sessionState?: string | null;
    user: User;
  }

  interface Session {
    user: {
      id: string;
      name?: string;
      address?: string;
      image?: string;
      walletType?: string;
    };
  }

  interface User {
    id: string;
    name: string | null;
    defaultAddress: string | null;
    nonce: string | null;
    email: string | null;
    emailVerified: Date | null;
    image: string | null;
  }

  interface Wallet {
    id: number;
    type: string | null;
    changeAddress: string;
    unusedAddresses: string[];
    usedAddresses: string[];
    userId: string;
    user?: User;
  }
}

const signUser = async (
  user: User,
  credentials: Credentials
): Promise<User | null> => {
  const walletParse: ParsedWallet = JSON.parse(credentials.wallet);
  const signatureParse = JSON.parse(credentials.signature);
  if (walletParse.type === "nautilus") {
    const signedMessageSplit = signatureParse.signedMessage.split(";");
    const nonce = signedMessageSplit[0];
    if (nonce !== user.nonce) {
      console.error(`Nonce doesn't match`);
      throw new Error(`Nonce doesn't match`);
    }
  } else if (walletParse.type === "mobile") {
    const nonce = signatureParse.signedMessage.slice(20, 41);
    if (nonce !== user.nonce) {
      console.error(`Nonce doesn't match`);
      throw new Error(`Nonce doesn't match`);
    }
  } else {
    throw new Error("Unrecognized wallet type");
  }

  const result = verifySignature(
    walletParse.defaultAddress,
    signatureParse.signedMessage,
    signatureParse.proof,
    walletParse.type
  );
  if (result) {
    const newNonce = nanoid();
    prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        nonce: newNonce,
      },
    });
    const newUser = { ...user, walletType: walletParse.type };
    return newUser;
  }
  return null;
};

export const createNewUser = async (
  user: User,
  credentials: Credentials
): Promise<User | null> => {
  const { nonce, userId, signature, wallet } = credentials;
  const walletParse: ParsedWallet = JSON.parse(wallet);
  const signatureParse = JSON.parse(signature);

  if (walletParse.type === "nautilus") {
    const signedMessageSplit = signatureParse.signedMessage.split(";");
    const nonce = signedMessageSplit[0];
    if (nonce !== user.nonce) {
      console.error(`Nonce doesn't match`);
      throw new Error(`Nonce doesn't match`);
    }
  } else if (walletParse.type === "mobile") {
    const nonce = signatureParse.signedMessage.slice(20, 41);
    if (nonce !== user.nonce) {
      console.error(`Nonce doesn't match`);
      throw new Error(`Nonce doesn't match`);
    }
  } else {
    throw new Error("Unrecognized wallet type");
  }

  try {
    const result = verifySignature(
      walletParse.defaultAddress,
      signatureParse.signedMessage,
      signatureParse.proof,
      walletParse.type
    );

    if (!result) {
      await prisma.user.delete({ where: { id: userId } });
      throw new Error("Verification failed."); // Throw error if verification fails
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name: walletParse.defaultAddress,
        defaultAddress: walletParse.defaultAddress,
        nonce,
        wallets: {
          create: [
            {
              type: walletParse.type,
              changeAddress: walletParse.defaultAddress,
              unusedAddresses: walletParse.unusedAddresses,
              usedAddresses: walletParse.usedAddresses,
            },
          ],
        },
      },
    });

    if (!user) {
      await prisma.user.delete({ where: { id: userId } });
      throw new Error("User update failed."); // Throw error if user update fails
    }

    const account = await prisma.account.create({
      data: {
        userId: user.id,
        type: "credentials",
        provider: "credentials",
        providerAccountId: walletParse.defaultAddress,
      },
    });

    if (user && account && result) {
      const newNonce = nanoid();
      await prisma.user.update({
        where: { id: user.id },
        data: {
          nonce: newNonce,
          status: "active",
        },
      });
      return user;
    } else {
      await prisma.user.delete({ where: { id: userId } });
      throw new Error("Failed to create account or update nonce."); // Throw error if account creation or nonce update fails
    }
  } catch (error) {
    console.error("Error creating new user: ", error);
    await prisma.user.delete({ where: { id: userId } });
    return null;
  }
};

export const authorize = async (
  credentials: any,
  req: Pick<RequestInternal, "query" | "body" | "headers" | "method">,
  res: NextApiResponse
): Promise<User | null> => {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return null;
    }

    const { nonce, userId, signature, wallet } = credentials as Credentials;

    if (!nonce || !userId || !signature || !wallet) {
      return null;
    }
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
      },
      include: {
        wallets: true,
      },
    });

    if (user && user.wallets.length > 0) {
      return signUser(user, credentials as Credentials);
    } else if (user && user.wallets.length === 0) {
      return createNewUser(user, credentials as Credentials);
    } else throw new Error("Unable to verify user");
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const signInCallback = async (
  req: NextApiRequest,
  res: NextApiResponse,
  { user, account }: any
) => {
  if (nextAuthInclude(req, "callback") && nextAuthInclude(req, "credentials")) {
    if (!user) return true;

    const sessionToken = nanoid();
    const sessionMaxAge = 60 * 60 * 24 * 30;
    const sessionExpiry = new Date(Date.now() + sessionMaxAge * 1000);

    await prisma.session.create({
      data: {
        sessionToken: sessionToken,
        userId: user.id,
        expires: sessionExpiry,
        walletType: user.walletType,
      },
    });

    setCookie(`next-auth.session-token`, sessionToken, {
      expires: sessionExpiry,
      req: req,
      res: res,
    });

    return true;
  }

  // Is this even required?
  // Check first if there is no user in the database. Then we can create new user with these OAuth credentials.
  const profileExists = await prisma.user.findFirst({
    where: {
      email: user.email,
    },
  });
  if (!profileExists) return true;

  // Check if there is an existing account in the database. Then we can log in with this account.
  const accountExists = await prisma.account.findFirst({
    where: {
      AND: [{ provider: account.provider }, { userId: profileExists.id }],
    },
  });
  if (accountExists) return true;

  // If there is no account in the database, we create a new account with these OAuth credentials.
  await prisma.account.create({
    data: {
      userId: profileExists.id,
      type: account.type,
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      accessToken: account.accessToken,
      expiresAt: account.expiresAt,
      tokenType: account.tokenType,
      scope: account.scope,
      idToken: account.idToken,
    },
  });

  // Since a user is already in the database we can update user information.
  await prisma.user.update({
    where: { id: profileExists.id },
    data: { name: user.name },
  });
  return user;
};

export const jwtCallback = ({ token, user }: any) => {
  if (user) {
    token.user = user;
  }
  return token;
};

export const sessionCallback = async (
  req: NextApiRequest,
  {
    session,
    user,
  }: {
    session: Session;
    user: any;
  }
) => {
  const cookie = getCookie(`next-auth.session-token`, {
    req: req,
  });
  let dbSession;
  if (typeof cookie === "string") {
    dbSession = await prisma.session.findFirst({
      where: {
        sessionToken: cookie,
      },
    });
  }
  if (user) {
    session.user = {
      id: user.id,
      name: user.name,
      address: user.defaultAddress,
      walletType: dbSession?.walletType!,
      image: user.image,
    };
  }
  return session;
};

export const getJwtHandlers = (req: NextApiRequest) => {
  return {
    encode: async ({
      token,
      secret,
      maxAge,
    }: JWTEncodeParams): Promise<any> => {
      if (
        nextAuthInclude(req, "callback") &&
        nextAuthInclude(req, "credentials") &&
        req.method === "POST"
      ) {
        const cookie = getCookie(`next-auth.session-token`, {
          req: req,
        });
        if (cookie) {
          return cookie;
        } else return "";
      }
      return encode({ token, secret, maxAge });
    },
    decode: async ({ token, secret }: JWTDecodeParams) => {
      if (
        nextAuthInclude(req, "callback") &&
        nextAuthInclude(req, "credentials") &&
        req.method === "POST"
      ) {
        return null;
      }

      return decode({ token, secret });
    },
  };
};

export const verifySignature = (
  address: string,
  message: string,
  proof: string,
  type: string
) => {
  const ergoAddress = Address.from_mainnet_str(address);
  const convertedMessage = Buffer.from(message, "utf-8");
  const convertedProof =
    type === "nautilus"
      ? Buffer.from(proof, "hex")
      : Buffer.from(proof, "base64");
  const result = verify_signature(
    ergoAddress,
    convertedMessage,
    convertedProof
  );
  return result;
};

const nextAuthInclude = (req: NextApiRequest, include: string) => {
  return req.query.nextauth?.includes(include);
};
