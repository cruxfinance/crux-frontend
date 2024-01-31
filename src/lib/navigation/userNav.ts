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
        subtitle: "Manage Subscription",
        link: "/user/subscription",
      },
      {
        subtitle: "Payments",
        link: "/user/payments",
      },
    ],
  },
  {
    header: "Wallet",
    items: [
      {
        subtitle: "Manage Connected Wallets",
      },
    ],
  },
];

export default userNavItems