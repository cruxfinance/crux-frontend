export const addressListFlatMap = (wallets: WalletListItem[]) => {
  // Extract addresses
  const addresses = wallets.flatMap(wallet => wallet.addresses)

  // Deduplicate addresses
  const uniqueAddresses = Array.from(new Set(addresses));

  return uniqueAddresses
}