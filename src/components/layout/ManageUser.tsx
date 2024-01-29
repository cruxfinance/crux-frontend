import { Fragment, ReactNode } from "react";
import {
  Box,
  Grid,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";
import { useRouter } from "next/router";

const listItemSx = {
  borderRadius: "5px",
  "&:hover": {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
};

interface SideNavItem {
  header: string;
  items: { subtitle: string; link?: string }[];
}

const sideNavItems: SideNavItem[] = [
  {
    header: "Account",
    items: [
      {
        subtitle: "Update User Profile",
      },
    ],
  },
  {
    header: "Subscriptions",
    items: [
      {
        subtitle: "Manage Subscriptions",
      },
      {
        subtitle: "Payment Instruments",
        link: "/user/payment-instruments",
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

const ManageUser = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  return (
    <Grid
      container
      maxWidth="lg"
      sx={{
        mx: "auto",
        flexDirection: "row-reverse",
        px: { xs: 2, md: 3 },
      }}
    >
      <Grid item md={9} xs={12}>
        {children}
      </Grid>
      <Grid item md={3} xs={12} sx={{ flexGrow: 1, mt: 8 }}>
        {sideNavItems.map((item, index) => {
          return (
            <Fragment key={item.header}>
              <Box
                sx={{
                  mr: { md: 12, xs: 0 },
                  mt: { md: index === 0 ? 0 : 2, xs: index === 0 ? 4 : 6 },
                  mb: 1,
                }}
              >
                <Typography
                  variant="h4"
                  sx={{ fontWeight: "700", lineHeight: "1.2" }}
                >
                  {item.header}
                </Typography>
              </Box>
              <List>
                {item.items.map((_item) => {
                  return (
                    <ListItemButton
                      disabled={_item.link ? false : true}
                      key={`${item.header}.${_item.subtitle}`}
                      sx={{ ...listItemSx }}
                      onClick={() => {
                        _item.link ? router.push(_item.link) : null;
                      }}
                    >
                      <ListItemText primary={_item.subtitle} />
                    </ListItemButton>
                  );
                })}
              </List>
            </Fragment>
          );
        })}
      </Grid>
    </Grid>
  );
};

export default ManageUser;
