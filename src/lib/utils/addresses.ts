export const addressListFlatMap = (wallets: WalletListItem[]) => {
  // Extract addresses
  const addresses = wallets.flatMap(wallet => wallet.addresses)

  // Deduplicate addresses
  const uniqueAddresses = Array.from(new Set(addresses));

  return uniqueAddresses
}

/**
 * The wallet's address list as sent to ci-api: change address first, then
 * used and unused addresses, each once. Nautilus also reports the change
 * address among the used ones, and a repeated address makes ci-api select
 * its boxes twice.
 */
export const walletAddressList = (
  changeAddress: string,
  usedAddresses: string[],
  unusedAddresses: string[]
): string[] =>
  Array.from(new Set([changeAddress, ...usedAddresses, ...unusedAddresses]));
