import React, { FC, useState } from "react";
import {
    Box,
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Tooltip,
    Typography,
    useTheme,
    Divider,
} from "@mui/material";
import {
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    CurrencyExchange as CurrencyExchangeIcon,
    AccountBalanceWallet as AccountBalanceWalletIcon,
    Assessment as AssessmentIcon,
    SwapCalls as SwapCallsIcon,
    Info as InfoIcon,
    ExpandLess,
    ExpandMore,
    AddCircleOutline as MintIcon,
    ShowChart as AnalyticsIcon,
} from "@mui/icons-material";
import { useRouter } from "next/router";
import Link from "@components/Link";
import { Collapse, useMediaQuery } from "@mui/material";
import Logo from "@components/svgs/Logo";

const DRAWER_WIDTH = 240;
const COLLAPSED_DRAWER_WIDTH = 64;

interface PageItem {
    name: string;
    link: string;
    icon: React.ReactNode;
    subItems?: { name: string; link: string; icon?: React.ReactNode }[];
}

const pages: PageItem[] = [
    {
        name: "Tokens",
        link: "/",
        icon: <CurrencyExchangeIcon />,
    },
    {
        name: "Portfolio",
        link: "/portfolio",
        icon: <AccountBalanceWalletIcon />,
    },
    {
        name: "Accounting",
        link: "/accounting",
        icon: <AssessmentIcon />,
    },
    {
        name: "USE & Dexy",
        link: "/dexy",
        icon: <SwapCallsIcon />,
        subItems: [
            { name: "Mint", link: "/dexy/mint", icon: <MintIcon /> },
            { name: "Analytics", link: "/dexy/analytics", icon: <AnalyticsIcon /> },
        ],
    },
    {
        name: "About",
        link: "/about",
        icon: <InfoIcon />,
    },
];

interface SidebarProps {
    mobileOpen?: boolean;
    onMobileClose?: () => void;
}

const Sidebar: FC<SidebarProps> = ({ mobileOpen, onMobileClose }) => {
    const theme = useTheme();
    const router = useRouter();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
    const [open, setOpen] = useState(false);
    const [expandedItem, setExpandedItem] = useState<string | null>(null);

    const handleDrawerToggle = () => {
        setOpen(!open);
        if (open) {
            setExpandedItem(null);
        }
    };

    const handleExpandItem = (name: string) => {
        setExpandedItem(expandedItem === name ? null : name);
    };

    const isActive = (path: string) => {
        if (path === "/") {
            return router.pathname === "/";
        }
        return router.pathname.startsWith(path);
    };

    const drawerContent = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: (open || isMobile) ? "space-between" : "center",
                    padding: theme.spacing(0, 2),
                    minHeight: "64px",
                    width: "100%",
                }}
            >
                <Link
                    href="/"
                    onClick={isMobile ? onMobileClose : undefined}
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        minWidth: 0,
                        textDecoration: "none",
                        "&:hover": {
                            "& span": {
                                color: theme.palette.primary.main,
                            },
                            "& .logo-svg": {
                                transform: "scale(1.1) rotate(-5deg)",
                                filter: `drop-shadow(0 0 8px ${theme.palette.primary.main})`,
                            },
                        },
                    }}
                >
                    <Logo
                        className="logo-svg"
                        sx={{
                            color: theme.palette.text.primary,
                            fontSize: "2.2rem",
                            flexShrink: 0,
                            transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                        }}
                    />
                    <Typography
                        component="span"
                        sx={{
                            ml: 1.5,
                            color: theme.palette.text.primary,
                            fontSize: "1.2rem",
                            fontWeight: "700",
                            lineHeight: 1,
                            fontFamily: '"Jura", sans-serif',
                            whiteSpace: "nowrap",
                            opacity: (open || isMobile) ? 1 : 0,
                            visibility: (open || isMobile) ? "visible" : "hidden",
                            transition: theme.transitions.create(["opacity", "visibility"], {
                                easing: theme.transitions.easing.sharp,
                                duration: theme.transitions.duration.enteringScreen,
                            }),
                        }}
                    >
                        Crux Finance
                    </Typography>
                </Link>
                {isMobile && (
                    <IconButton onClick={onMobileClose} sx={{ color: theme.palette.text.secondary }}>
                        <ChevronLeftIcon />
                    </IconButton>
                )}
            </Box>

            {/* Floating Toggle Handle (Desktop only) */}
            {!isMobile && (
                <IconButton
                    onClick={handleDrawerToggle}
                    sx={{
                        position: "absolute",
                        bottom: 40,
                        right: 16,
                        width: 32,
                        height: 32,
                        backgroundColor: theme.palette.mode === 'dark'
                            ? "rgba(33, 39, 55, 0.95)"
                            : "rgba(255, 255, 255, 0.95)",
                        border: `1.5px solid ${theme.palette.primary.main}`,
                        backdropFilter: "blur(8px)",
                        borderRadius: "50%",
                        zIndex: theme.zIndex.drawer + 2,
                        boxShadow: theme.palette.mode === 'dark'
                            ? "0 4px 12px rgba(0,0,0,0.5)"
                            : "0 4px 12px rgba(0,0,0,0.15)",
                        color: theme.palette.primary.main,
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                        "&:hover": {
                            backgroundColor: theme.palette.primary.main,
                            color: "#fff",
                            transform: "scale(1.15)",
                            boxShadow: `0 0 10px ${theme.palette.primary.main}`,
                        },
                    }}
                >
                    <ChevronLeftIcon
                        sx={{
                            fontSize: "1.2rem",
                            transition: "transform 0.3s ease",
                            transform: open ? "rotate(0deg)" : "rotate(180deg)"
                        }}
                    />
                </IconButton>
            )}

            <Divider sx={{ opacity: 0.1 }} />
            <List sx={{ mt: 1 }}>
                {pages.map((page) => {
                    const hasSubItems = page.subItems && page.subItems.length > 0;
                    const isExpanded = expandedItem === page.name;
                    const itemActive = isActive(page.link);

                    return (
                        <React.Fragment key={page.name}>
                            <ListItem disablePadding sx={{ display: "block", mb: 0.5 }}>
                                <Tooltip
                                    title={(!open && !isMobile) ? page.name : ""}
                                    placement="right"
                                    arrow
                                    disableHoverListener={open || isMobile}
                                >
                                    <Box>
                                        <ListItemButton
                                            component={hasSubItems ? "div" : Link}
                                            href={hasSubItems ? undefined : page.link}
                                            onClick={hasSubItems
                                                ? () => handleExpandItem(page.name)
                                                : (isMobile ? onMobileClose : undefined)
                                            }
                                            sx={{
                                                minHeight: 48,
                                                justifyContent: (open || isMobile) ? "initial" : "center",
                                                px: 2.5,
                                                mx: 1,
                                                borderRadius: "12px",
                                                position: "relative",
                                                color: itemActive
                                                    ? theme.palette.primary.main
                                                    : theme.palette.text.primary,
                                                backgroundColor: itemActive
                                                    ? "rgba(254, 107, 139, 0.08)"
                                                    : "transparent",
                                                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                                                "&:hover": {
                                                    backgroundColor: "rgba(254, 107, 139, 0.12)",
                                                    color: theme.palette.primary.main,
                                                    transform: "translateX(4px)",
                                                    "& .MuiListItemIcon-root": {
                                                        color: theme.palette.primary.main,
                                                        transform: "scale(1.1)",
                                                    },
                                                },
                                                ...(itemActive && {
                                                    "&::before": {
                                                        content: '""',
                                                        position: "absolute",
                                                        left: -8,
                                                        top: "20%",
                                                        height: "60%",
                                                        width: "4px",
                                                        backgroundColor: theme.palette.primary.main,
                                                        borderRadius: "0 4px 4px 0",
                                                        boxShadow: `0 0 10px ${theme.palette.primary.main}`,
                                                    }
                                                })
                                            }}
                                        >
                                            <ListItemIcon
                                                sx={{
                                                    minWidth: 0,
                                                    mr: (open || isMobile) ? 3 : "auto",
                                                    justifyContent: "center",
                                                    color: itemActive
                                                        ? theme.palette.primary.main
                                                        : "inherit",
                                                    transition: "all 0.2s ease",
                                                }}
                                            >
                                                {page.icon}
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={page.name}
                                                sx={{
                                                    opacity: (open || isMobile) ? 1 : 0,
                                                    "& .MuiTypography-root": {
                                                        fontWeight: itemActive ? 700 : 500,
                                                        fontSize: "0.95rem",
                                                        letterSpacing: "0.02em",
                                                    },
                                                }}
                                            />
                                            {(open || isMobile) && hasSubItems && (
                                                <Box sx={{
                                                    display: "flex",
                                                    transition: "transform 0.3s ease",
                                                    transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)"
                                                }}>
                                                    <ExpandMore sx={{ fontSize: "1.2rem", opacity: 0.7 }} />
                                                </Box>
                                            )}
                                        </ListItemButton>
                                    </Box>
                                </Tooltip>
                            </ListItem>
                            {hasSubItems && (
                                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                    <List component="div" disablePadding sx={{ mb: 1 }}>
                                        {page.subItems?.map((subItem) => (
                                            <Tooltip
                                                key={subItem.name}
                                                title={(!open && !isMobile) ? subItem.name : ""}
                                                placement="right"
                                                arrow
                                                disableHoverListener={open || isMobile}
                                            >
                                                <Box>
                                                    <ListItemButton
                                                        component={Link}
                                                        href={subItem.link}
                                                        onClick={isMobile ? onMobileClose : undefined}
                                                        sx={{
                                                            minHeight: 40,
                                                            pl: (open || isMobile) ? 6 : 2.5,
                                                            mx: 1,
                                                            borderRadius: "10px",
                                                            justifyContent: (open || isMobile) ? "initial" : "center",
                                                            color: isActive(subItem.link)
                                                                ? theme.palette.primary.main
                                                                : theme.palette.text.secondary,
                                                            backgroundColor: isActive(subItem.link)
                                                                ? "rgba(254, 107, 139, 0.05)"
                                                                : "transparent",
                                                            transition: "all 0.2s ease",
                                                            "&:hover": {
                                                                backgroundColor: "rgba(254, 107, 139, 0.08)",
                                                                color: theme.palette.primary.main,
                                                                pl: (open || isMobile) ? 6.5 : 2.5,
                                                            },
                                                        }}
                                                    >
                                                        {subItem.icon && (
                                                            <ListItemIcon
                                                                sx={{
                                                                    minWidth: 0,
                                                                    mr: (open || isMobile) ? 2 : "auto",
                                                                    justifyContent: "center",
                                                                    color: isActive(subItem.link) ? theme.palette.primary.main : "inherit",
                                                                    fontSize: "1.2rem",
                                                                    transition: "all 0.2s ease",
                                                                }}
                                                            >
                                                                {React.cloneElement(subItem.icon as React.ReactElement, { sx: { fontSize: "1.1rem" } })}
                                                            </ListItemIcon>
                                                        )}
                                                        <ListItemText
                                                            primary={subItem.name}
                                                            sx={{
                                                                opacity: (open || isMobile) ? 1 : 0,
                                                                "& .MuiTypography-root": {
                                                                    fontSize: "0.85rem",
                                                                    fontWeight: isActive(subItem.link) ? 600 : 400,
                                                                },
                                                            }}
                                                        />
                                                    </ListItemButton>
                                                </Box>
                                            </Tooltip>
                                        ))}
                                    </List>
                                </Collapse>
                            )}
                        </React.Fragment>
                    );
                })}
            </List>
        </Box>
    );

    return (
        <Box
            component="nav"
            sx={{
                width: { sm: open ? DRAWER_WIDTH : COLLAPSED_DRAWER_WIDTH },
                flexShrink: { sm: 0 },
            }}
        >
            {/* Mobile Drawer */}
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={onMobileClose}
                ModalProps={{
                    keepMounted: true, // Better open performance on mobile.
                }}
                sx={{
                    display: { xs: 'block', sm: 'none' },
                    "& .MuiDrawer-paper": {
                        boxSizing: "border-box",
                        width: DRAWER_WIDTH,
                        backgroundColor: theme.palette.mode === 'dark'
                            ? "rgba(11, 12, 21, 0.95)"
                            : "rgba(255, 255, 255, 0.95)",
                        backdropFilter: "blur(12px)",
                    },
                }}
            >
                {drawerContent}
            </Drawer>

            {/* Desktop Drawer */}
            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: 'none', sm: 'block' },
                    "& .MuiDrawer-paper": {
                        width: open ? DRAWER_WIDTH : COLLAPSED_DRAWER_WIDTH,
                        boxSizing: "border-box",
                        overflowX: "hidden",
                        transition: theme.transitions.create(["width", "background-color"], {
                            easing: theme.transitions.easing.sharp,
                            duration: theme.transitions.duration.enteringScreen,
                        }),
                        backgroundColor: theme.palette.mode === 'dark'
                            ? "rgba(11, 12, 21, 0.8)"
                            : "rgba(255, 255, 255, 0.8)",
                        backdropFilter: "blur(12px)",
                        borderRight: `1px solid ${theme.palette.divider}`,
                        boxShadow: theme.palette.mode === 'dark'
                            ? "4px 0 24px rgba(0, 0, 0, 0.5)"
                            : "4px 0 24px rgba(0, 0, 0, 0.05)",
                    },
                }}
                open
            >
                {drawerContent}
            </Drawer>
        </Box>
    );
};

export default Sidebar;
