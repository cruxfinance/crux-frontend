import { prisma } from '@server/prisma';
// import { Address } from 'ergo-lib-wasm-nodejs';
import { NextApiRequest, NextApiResponse } from 'next';


interface ErgoAuthRequest {
  address: string;
  signingMessage: string;
  sigmaBoolean: string;
  userMessage: string;
  messageSeverity: "INFORMATION";
  replyTo: string;
}

export default async function ergoauthLoginMobile(req: NextApiRequest, res: NextApiResponse) {
  const { verificationId } = req.query;

  // Fetch the login request using the verificationId
  const loginRequest = await prisma.loginRequest.findUnique({
    where: { verificationId: verificationId as string },
  });

  if (!loginRequest) {
    return res.status(404).json({ error: 'Invalid login request' });
  }

  const user = await prisma.user.findUnique({
    where: { id: loginRequest.user_id },
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!user.nonce) {
    return res.status(404).json({ error: 'Signing message was not generated, please try again' });
  }

  const address = user.defaultAddress;

  if (!address) {
    return res.status(404).json({ error: 'User address not found' });
  }

  try {
    const replyTo = `https://cruxfinance.io/api/mobile-auth/verify?verificationId=${verificationId}`;
    // console.log(address)
    // const rawBytes = Address.from_mainnet_str(address).to_ergo_tree().to_base16_bytes()
    // const sigmaBoolean = Buffer.from(rawBytes).toString('base64');

    // use paideia API to get the sigmaBoolean because there is no way to do it without accessing the appkit
    // First API call
    const loginResponse = await fetch('https://api.paideia.im/auth/login/mobile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        addresses: [address],
      }),
    });

    const loginData = await loginResponse.json();

    // console.log(loginData)

    // Extract requestId from the first response
    const requestId = loginData.verificationId;

    // Second API call
    const signingRequestResponse = await fetch(`https://api.paideia.im/auth/signing_request/${requestId}`);
    const signingRequestData = await signingRequestResponse.json();

    // Extract sigmaBoolean from the second response
    const sigmaBoolean = signingRequestData.sigmaBoolean;

    console.log('address boolean: ' + sigmaBoolean)

    const ergoAuthRequest: ErgoAuthRequest = {
      address,
      signingMessage: user.nonce,
      sigmaBoolean,
      userMessage: 'Sign the message to sign in to Crux Finance',
      messageSeverity: 'INFORMATION',
      replyTo,
    };
    // console.log(ergoAuthRequest)
    res.status(200).json(ergoAuthRequest);
  } catch (e: any) {
    res.status(500).json({ error: `ERR::login::${e.message}` });
  }
}