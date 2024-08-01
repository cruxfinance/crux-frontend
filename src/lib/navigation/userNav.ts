const userNavItems: SideNavItem[] = [
  {
    header: "Account",
    items: [
      {
        subtitle: "Update User Profile",
        link: "/user",
      },
    ],
  },
  {
    header: "Subscriptions",
    items: [
      {
        subtitle: "Manage Subscriptions",
        link: "/user/subscription",
      },
      {
        subtitle: "Prepaid Balances",
        link: "/user/payments",
      },
    ],
  },
  {
    header: "Wallet",
    items: [
      {
        subtitle: "Connected Wallets",
        link: "/user/wallets",
      }
    ],
  },
];

export default userNavItems