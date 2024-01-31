import { FC, Fragment, ReactNode } from "react";
import {
  Box,
  Container,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";
import { useRouter } from "next/router";
import Grid from "@mui/system/Unstable_Grid/Grid";

const listItemSx = {
  borderRadius: "5px",
  mb: '2px',
  "&:hover": {
    backgroundColor: "rgba(150, 150, 150, 0.1)",
  },
};

interface SideMenuProps {
  children: ReactNode;
  title: string;
  navItems: SideNavItem[]
}

const Navigation: FC<{ navItems: SideNavItem[] }> = ({ navItems }) => {
  const router = useRouter();
  const pathname = router.pathname
  return <>
    {navItems.map((item, index) => {
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
              variant="h5"
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
                  sx={{
                    ...listItemSx,
                    background: pathname === _item.link ? "rgba(150, 150, 150, 0.05)" : 'none'
                  }}
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
  </>
}

const SideMenu: FC<SideMenuProps> = ({ children, title, navItems }) => {
  return (
    <Container maxWidth="lg">
      <Typography variant="h3" sx={{ fontWeight: 700, mb: 4 }}>
        {title}
      </Typography>
      <Grid
        container
        spacing={4}
        sx={{
          flexDirection: "row-reverse",
        }}
      >
        <Grid sm={8} md={9} xs={12}>
          {children}
        </Grid>
        <Grid sm={4} md={3} xs={12} sx={{ flexGrow: 1 }}>
          <Navigation navItems={navItems} />
        </Grid>
      </Grid>
    </Container>
  );
};

export default SideMenu;
