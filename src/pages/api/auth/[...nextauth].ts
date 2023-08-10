import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from '@server/prisma';
import {
  NextApiRequest,
  NextApiResponse,
} from 'next';
import NextAuth, { NextAuthOptions, Session, User, getServerSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GithubProvider from 'next-auth/providers/github';

import { getCookie, setCookie } from 'cookies-next';
import { randomUUID } from 'crypto';
import {
  JWT,
  JWTDecodeParams,
  JWTEncodeParams,
  decode,
  encode
} from 'next-auth/jwt';

type Credentials = {
  nonce: string;
  rewardAddress: string;
  signature: string;
  wallet: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  return await NextAuth(req, res, authOptions(req, res))
}

export const authOptions = (
  req: NextApiRequest,
  res: NextApiResponse
): NextAuthOptions => {

  function resMessage(status: number, message: string) {
    return res.status(status).json({
      statusText: message,
    })
  }

  function nextAuthInclude(include: string) {
    return req.query.nextauth?.includes(include)
  }

  async function signUser(user: User, credentials: Credentials): Promise<User | null> {
    const signatureParse = JSON.parse(credentials.signature)
    const walletParse = JSON.parse(credentials.wallet)
    // const result = checkSignature(credentials.nonce, credentials.rewardAddress, signatureParse);
    // if (result) {
    //   // set a new nonce for the user to make sure an attacker can't reuse this one
    //   // const newNonce = generateNonce('Sign to login: ');
    //   prisma.user.update({
    //     where: {
    //       id: user.id
    //     },
    //     data: {
    //       nonce: newNonce
    //     }
    //   })
    //   const newUser = { ...user, walletType: walletParse.type }
    //   return newUser
    // }
    return null
  }

  async function createNewUser(credentials: Credentials): Promise<User | null> {
    const { nonce, rewardAddress, signature, wallet } = credentials
    const walletParse = JSON.parse(wallet)
    const signatureParse = JSON.parse(signature)
    const user = await prisma.user.update({
      where: {
        rewardAddress: rewardAddress
      },
      data: {
        name: walletParse.address,
        rewardAddress,
        defaultAddress: walletParse.address,
        nonce,
        wallets: {
          create: [
            {
              rewardAddress: walletParse.rewardAddress,
              changeAddress: walletParse.address
            }
          ]
        }
      },
    })
    if (!user) null

    const account = await prisma.account.create({
      data: {
        userId: user.id,
        type: 'credentials',
        provider: 'credentials',
        providerAccountId: walletParse.address,
      },
    })
    // const result = checkSignature(nonce, rewardAddress, signatureParse);
    // if (user && account && result) {
    //   // set a new nonce for the user to make sure an attacker can't reuse this one
    //   const newNonce = generateNonce('Sign to login: ');
    //   prisma.user.update({
    //     where: {
    //       id: user.id
    //     },
    //     data: {
    //       nonce: newNonce
    //     }
    //   })
    //   return user
    // }
    return null
  }

  return {
    adapter: PrismaAdapter(prisma),
    providers: [
      GithubProvider({
        clientId: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_SECRET_ID!
      }),
      CredentialsProvider({
        name: 'credentials',
        credentials: {
          nonce: {
            label: "Nonce",
            type: "text",
            placeholder: "",
          },
          rewardAddress: {
            label: "Reward Address",
            type: "text",
            placeholder: "",
          },
          signature: {
            label: "Signature",
            type: "text",
            placeholder: "",
          },
          wallet: {
            label: "Wallet",
            type: "text",
            placeholder: "",
          }
        },
        async authorize(credentials, req): Promise<User | null> {
          try {
            if (req.method !== 'POST') {
              res.setHeader('Allow', ['POST'])
              return null
            }

            const { nonce, rewardAddress, signature, wallet } =
              credentials as Credentials

            if (!nonce || !rewardAddress || !signature) {
              return null
            }

            // NOTE THAT WE CREATED A USER WHEN GENERATING A NONCE
            // Even if this is a new user, we will already have a database entry
            // But in that case, defaultAddress will be null so we just have to
            // check for that scenario. 
            const user = await prisma.user.findFirst({
              where: {
                rewardAddress: rewardAddress,
                NOT: {
                  defaultAddress: null,
                },
              },
            }) as User;

            // User already exists
            if (user) return signUser(user, credentials as Credentials)

            // User is new
            return createNewUser(credentials as Credentials)
          } catch (error) {
            console.error(error)
            return null
          }
        },
      }),
    ],
    callbacks: {
      async signIn({ user, account, email }: any) {
        if (nextAuthInclude('callback') && nextAuthInclude('credentials')) {
          if (!user) return true

          const sessionToken = randomUUID()
          const sessionMaxAge = 60 * 60 * 24 * 30
          const sessionExpiry = new Date(Date.now() + sessionMaxAge * 1000)

          await prisma.session.create({
            data: {
              sessionToken: sessionToken,
              userId: user.id,
              expires: sessionExpiry,
              walletType: user.walletType
            },
          })

          setCookie(`next-auth.session-token`, sessionToken, {
            expires: sessionExpiry,
            req: req,
            res: res,
          })

          return true
        }

        // Check first if there is no user in the database. Then we can create new user with this OAuth credentials.
        const profileExists = await prisma.user.findFirst({
          where: {
            email: user.email,
          },
        })
        if (!profileExists) return true

        // Check if there is an existing account in the database. Then we can log in with this account.
        const accountExists = await prisma.account.findFirst({
          where: {
            AND: [{ provider: account.provider }, { userId: profileExists.id }],
          },
        })
        if (accountExists) return true

        // If there is no account in the database, we create a new account with this OAuth credentials.
        await prisma.account.create({
          data: {
            userId: profileExists.id,
            type: account.type,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            access_token: account.access_token,
            expires_at: account.expires_at,
            token_type: account.token_type,
            scope: account.scope,
            id_token: account.id_token,
          },
        })

        // Since a user is already exist in the database we can update user information.
        await prisma.user.update({
          where: { id: profileExists.id },
          data: { name: user.name },
        })
        return user
      },
      async jwt({ token, user }: any) {
        if (user) {
          token.user = user;
        }
        return token
      },
      async session({
        session,
        user
      }: {
        session: Session;
        token: JWT;
        user: any;
      }) {
        // we have to get the cookie to get the session ID because 
        // it doesn't seem possible to pass it along the auth flow
        const cookie = getCookie(`next-auth.session-token`, {
          req: req,
        })
        let dbSession
        if (typeof cookie === 'string') {
          dbSession = await prisma.session.findFirst({
            where: {
              sessionToken: cookie
            },
          })
        }
        if (user) {
          session.user = {
            id: user.id,
            name: user.name,
            address: user.defaultAddress,
            walletType: dbSession?.walletType!,
            image: user.image,
          }
        }
        return session
      },
    },
    jwt: {
      encode: async ({
        token,
        secret,
        maxAge,
      }: JWTEncodeParams): Promise<any> => {
        if (
          nextAuthInclude('callback') &&
          nextAuthInclude('credentials') &&
          req.method === 'POST'
        ) {
          const cookie = getCookie(`next-auth.session-token`, {
            req: req,
          })
          if (cookie) {
            console.log(cookie)
            return cookie
          }
          else return ''
        }

        return encode({ token, secret, maxAge })
      },
      decode: async ({ token, secret }: JWTDecodeParams) => {
        if (
          nextAuthInclude('callback') &&
          nextAuthInclude('credentials') &&
          req.method === 'POST'
        ) {
          return null
        }

        return decode({ token, secret })
      },
    },
  }
}

export const getServerAuthSession = (req: any, res: any) => {
  return getServerSession(req, res, authOptions(req, res))
}