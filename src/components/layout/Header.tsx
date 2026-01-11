import React, { FC, useEffect } from "react";
import AppBar from "@mui/material/AppBar";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import {
  // Theme,
  Fade,
  Divider,
  IconButton,
  Button,
  Avatar,
  useMediaQuery,
  useTheme,
  Dialog,
  DialogContent,
} from "@mui/material";
import Box from "@mui/material/Box";
import Link from "@components/Link";
// import { ThemeContext } from "@contexts/ThemeContext";
import Logo from "@components/svgs/Logo";
import NotificationsMenu from "@components/notifications/NotificationsMenu";
import UserMenu from "@components/user/UserMenu";
import MenuIcon from "@mui/icons-material/Menu";
import ClearIcon from "@mui/icons-material/Clear";
import useScrollTrigger from "@mui/material/useScrollTrigger";
import SocialGrid from "./SocialGrid";
// import { DarkTheme, LightTheme } from "@theme/theme";
// import Brightness4Icon from '@mui/icons-material/Brightness4';
// import Brightness7Icon from '@mui/icons-material/Brightness7';
// import IconButton from "@mui/material/IconButton";
import { useRouter } from "next/router";
import { useScrollLock } from "@contexts/ScrollLockContext";

const pages = [
  {
    name: "Tokens",
    link: "/",
  },
  {
    name: "Portfolio",
    link: "/portfolio",
  },
  // {
  //   name: "Alerts",
  //   link: "/alerts",
  //   disabled: true,
  // },
  // {
  //   name: "Trading Floor",
  //   link: "/trading-floor",
  //   disabled: true,
  // },
  {
    name: "Accounting",
    link: "/accounting",
  },
  {
    name: "USE Analytics",
    link: "/use-analytics",
  },
  {
    name: "About",
    link: "/about",
  },
];

interface INavItemProps {
  size?: number;
  fontWeight?: number;
  page: {
    name: string;
    link: string;
    disabled?: boolean;
  };
}

interface IHeaderProps {}

const Header: FC<IHeaderProps> = ({}) => {
  // const {
  //   theme,
  //   // setTheme
  // } = useContext(ThemeContext);
  const { lockScroll, unlockScroll, isLocked, scrollBarCompensation } =
    useScrollLock();

  const theme = useTheme();
  const [navbarOpen, setNavbarOpen] = React.useState(false);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);

  useEffect(() => {
    // console.log('hello')
  }, [isLocked, scrollBarCompensation]);

  const router = useRouter();
  const upMd = useMediaQuery(theme.breakpoints.up("md"));
  const upLg = useMediaQuery(theme.breakpoints.up("lg"));

  const handleDialogOpen = () => {
    lockScroll();
    setNavbarOpen(false);
    setNotificationsOpen(true);
  };

  const handleDialogClose = () => {
    unlockScroll();
    setNotificationsOpen(false);
  };

  const handleNavbarToggle = () => {
    if (navbarOpen === true) {
      unlockScroll();
      setNavbarOpen(false);
    } else {
      lockScroll();
      setNavbarOpen(true);
      setNotificationsOpen(false);
    }
  };

  const handleNavbarDialogClose = () => {
    unlockScroll();
    setNavbarOpen(false);
  };

  // const toggleTheme = () => {
  //   setTheme((prevTheme: Theme) => (prevTheme === LightTheme ? DarkTheme : LightTheme));
  //   let temp = theme === LightTheme ? "dark" : "light";
  //   localStorage.setItem('darkToggle', temp);
  //   // console.log(temp)
  // };

  const NavigationListItem: React.FC<INavItemProps> = ({
    size,
    fontWeight,
    page,
  }) => {
    return (
      <Grid item>
        <Box
          sx={{
            display: "inline-block",
            position: "relative",
            // "&::after": {
            //   content: '""',
            //   position: 'absolute',
            //   bottom: '-4px',
            //   display: 'block',
            //   mt: '0',
            //   borderRadius: '10px',
            //   height: (fontWeight && fontWeight > 500) || (size && size > 20) ? '3px' : '2px',
            //   background: router.pathname === page.link ? theme.palette.primary.main : '',
            //   width: '100%',
            // },
          }}
        >
          {page.disabled ? (
            <Typography
              sx={{
                color: theme.palette.text.secondary,
                fontSize: size ? size.toString() + "px" : "16px",
                textDecoration: "none",
                fontWeight: fontWeight ? fontWeight : "600",
                px: "8px",
              }}
            >
              {page.name}
            </Typography>
          ) : (
            <Box
              onClick={() => {
                if (!upMd) handleNavbarToggle();
              }}
            >
              <Link
                href={page.link}
                sx={{
                  color: router.pathname.includes(page.link)
                    ? theme.palette.primary.main
                    : theme.palette.text.primary,
                  "&:hover": {
                    color: theme.palette.primary.main,
                  },
                }}
              >
                <Typography
                  sx={{
                    fontSize: size ? size.toString() + "px" : "16px",
                    textDecoration: "none",
                    fontWeight: fontWeight ? fontWeight : "500",
                    px: "8px",
                  }}
                >
                  {page.name}
                </Typography>
              </Link>
            </Box>
          )}
        </Box>
      </Grid>
    );
  };

  // const trigger = useScrollTrigger({
  //   disableHysteresis: router.pathname === "/" ? true : false,
  //   threshold: 0,
  // });

  return (
    <>
      <AppBar
        position="relative"
        elevation={12}
        sx={{
          zIndex: 91,
          border: "none",
          // top: trigger && router.pathname !== '/' ? '-60px' : 0,
          borderBottom: `none`,
          // backdropFilter: "blur(10px)",
          backdropFilter: "none",
          borderRadius: "0px",
          background:
            navbarOpen || notificationsOpen
              ? theme.palette.background.default
              : "none",
          // boxShadow: router.pathname === '/'
          //   // && !trigger
          //   ? 'none'
          //   : '3px 3px 15px 5px rgba(0,0,0,0.5)',
          boxShadow: "none!important",
          // background: navbarOpen || notificationsOpen
          //   ? theme.palette.background.default
          //   : router.pathname === '/'
          //     // && !trigger
          //     ? 'none'
          //     : 'radial-gradient(at right top, #12121B, #0A0D15)',
          transition: "background 200ms, box-shadow 200ms, top 400ms",
          "&:before": {
            p: 0,
          },
          mb: "24px",
          // width: "100vw",
        }}
      >
        <Box sx={{ mx: 2 }}>
          <Grid
            container
            justifyContent="space-between"
            alignItems="center"
            sx={{
              // height: router.pathname === '/'
              //   // && !trigger
              //   && upMd
              //   ? "90px"
              //   : '60px',
              height: "60px",
              transition: "height 400ms",
            }}
          >
            <Grid item alignItems="center">
              <Link
                href="/"
                sx={{
                  display: "block",
                  "&:hover": {
                    "& span": {
                      color: theme.palette.primary.main,
                    },
                    "& .MuiSvgIcon-root": {
                      color: theme.palette.primary.main,
                    },
                  },
                }}
              >
                <Logo
                  sx={{
                    display: "inline-block",
                    verticalAlign: "middle",
                    mr: "3px",
                    // fontSize: '64px',
                    color: theme.palette.text.primary,
                  }}
                />
                <Typography
                  component="span"
                  sx={{
                    color: theme.palette.text.primary,
                    fontSize: "1.6rem!important",
                    fontWeight: "700",
                    lineHeight: 1,
                    display: upLg ? "inline-block" : "none",
                    verticalAlign: "middle",
                    fontFamily: '"Jura", sans-serif',
                  }}
                >
                  Crux Finance
                </Typography>
              </Link>
            </Grid>
            <Grid item sx={{ display: { xs: "none", md: "flex" } }}>
              <Grid container spacing={2}>
                {pages.map((page, i) => (
                  <NavigationListItem
                    size={16}
                    key={i}
                    page={page}
                    fontWeight={500}
                  />
                ))}
              </Grid>
            </Grid>
            <Grid item>
              <Grid container spacing={2} alignItems="center">
                {/* <IconButton onClick={toggleTheme} sx={{ color: theme.palette.text.primary }}>
                    {(theme === DarkTheme) ? <Brightness7Icon /> : <Brightness4Icon />}
                  </IconButton> */}
                <Grid item>
                  <NotificationsMenu
                    dialogOpen={notificationsOpen}
                    setDialogOpen={setNotificationsOpen}
                    handleDialogClose={handleDialogClose}
                    handleDialogOpen={handleDialogOpen}
                  />
                </Grid>
                <Grid item>
                  <UserMenu />
                </Grid>
                <Grid item sx={{ display: { xs: "flex", md: "none" } }}>
                  <IconButton sx={{ p: 0 }} onClick={handleNavbarToggle}>
                    {!navbarOpen ? (
                      <MenuIcon color="primary" />
                    ) : (
                      <ClearIcon color="primary" />
                    )}
                  </IconButton>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Box>
      </AppBar>
      <Dialog
        open={navbarOpen}
        onClose={handleNavbarDialogClose}
        fullScreen
        sx={{
          zIndex: 12000,
          "& .MuiBackdrop-root": {
            backdropFilter: "blur(3px)",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          },
          "& .MuiDialog-paper": {
            zIndex: 12000,
          },
        }}
      >
        <DialogContent>
          <IconButton
            sx={{
              position: "fixed",
              top: "25px",
              right: isLocked ? `${scrollBarCompensation + 8}px` : "8px",
            }}
            onClick={handleNavbarToggle}
          >
            <ClearIcon color="primary" />
          </IconButton>
          <Box
            sx={{
              height: "100%",
              // width: "100vw",
              // position: "fixed",
              // top: 0,
              // zIndex: 10002,
              // background: theme.palette.background.default,
              // mt: "90px",
              // p: "16px",
              // pb: 0,
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                height: "100%",
                pb: 2,
              }}
            >
              <Box>
                <Grid
                  container
                  spacing={5}
                  direction="column"
                  justifyContent="flex-end"
                  alignItems="flex-start"
                  sx={{
                    mb: 3,
                  }}
                >
                  {pages.map((page) => (
                    <NavigationListItem size={24} key={page.name} page={page} />
                  ))}
                </Grid>
              </Box>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Header;
