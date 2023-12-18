export interface Signature {
  signedMessage: string;
  proof: string;
}

export type NonceResponse = {
  nonce: string;
  userId: string;
};

export type Anchor = "bottom" | "left" | "right" | "top" | undefined;
