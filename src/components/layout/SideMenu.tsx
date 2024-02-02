import { FC, Fragment, ReactNode, useEffect, useState } from "react";
import {
  Box,
  Container,
  Drawer,
  Fab,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  Zoom,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useRouter } from "next/router";
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import { useScrollLock } from "@contexts/ScrollLockContext";

const DRAWER_WIDTH = 240;

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
  noMaxWidth?: boolean
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

const SideMenu: FC<SideMenuProps> = ({ children, title, navItems, noMaxWidth }) => {
  const theme = useTheme()
  const desktop = useMediaQuery(theme.breakpoints.up('sm'))
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const { isLocked, scrollBarCompensation } = useScrollLock();

  return (
    <>
      {!desktop &&
        <>
          <Box
            component="nav"
            aria-label="dashboard-menu"
            onClick={handleDrawerToggle}
          >
            <Drawer
              variant={"temporary"}
              open={mobileOpen}
              onClose={handleDrawerToggle}
              ModalProps={{
                keepMounted: true, // Better open performance on mobile.
              }}
              sx={{
                zIndex: 10000,
                display: 'block',
                [`& .MuiDrawer-paper`]: {
                  borderRadius: 0,
                  background: theme.palette.background.paper,
                  width: DRAWER_WIDTH,
                  boxSizing: 'border-box',
                  zIndex: 100,
                  mt: 0,
                  px: 2,
                  pt: 3,
                },
              }}
            >
              <Navigation navItems={navItems} />
            </Drawer>
          </Box>
          <Zoom
            in={!mobileOpen}
            timeout={200}
            style={{
              transitionDelay: `100ms`,
            }}
          >
            <Fab
              variant="extended"
              color="primary"
              onClick={handleDrawerToggle}
              sx={{
                position: 'fixed',
                bottom: '30px',
                right: '30px',
                mr: isLocked ? `${scrollBarCompensation}px` : 0,
                zIndex: 200,
                fontWeight: 700,
                fontSize: '18px'
              }}
            >
              <MenuOpenIcon />
              Menu
            </Fab>
          </Zoom>
          <Container maxWidth="md" sx={{ overflow: 'clip' }}>
            {children}
          </Container>
        </>
      }
      {desktop &&
        <Box sx={{
          mx: noMaxWidth ? 2 : 'auto',
          maxWidth: noMaxWidth ? 'none' : '1100px'
        }}>
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 4 }}>
            {title}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexDirection: "row",
              gap: 4,
              maxWidth: '100%'
            }}
          >
            <Box sx={{ width: '240px' }}>
              <Navigation navItems={navItems} />
            </Box>
            <Box sx={{ maxWidth: 'calc(100% - 240px)', flexGrow: 1 }}>
              {children}
            </Box>
          </Box>
        </Box>
      }
    </>
  );
};

export default SideMenu;
