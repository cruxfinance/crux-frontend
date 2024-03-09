import React, { FC, useState, useEffect, useRef } from "react";
import {
  IconButton,
  useTheme,
  Typography,
  Box,
  Button,
  Grid,
  Badge,
  Popover,
  MenuList,
  MenuItem,
  ListItemIcon,
  useMediaQuery,
  Dialog,
  Link,
  DialogContent,
} from "@mui/material";
import PriorityHighIcon from "@mui/icons-material/PriorityHigh";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import NotificationsIcon from "@mui/icons-material/Notifications";
import ClearIcon from "@mui/icons-material/Clear";
import { useScrollLock } from "@contexts/ScrollLockContext";
import { Notification } from "@prisma/client";
import { trpc } from "@lib/trpc";
import { useWallet } from "@contexts/WalletContext";

interface IMenuItemProps extends Notification {
  icon: React.ReactElement;
  index: number;
}

interface INotificationsProps {
  dialogOpen: boolean;
  setDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleDialogOpen: Function;
  handleDialogClose: Function;
}

const NotificationsMenu: FC<INotificationsProps> = ({
  dialogOpen,
  setDialogOpen,
  handleDialogOpen,
  handleDialogClose,
}) => {
  const { lockScroll, unlockScroll, isLocked, scrollBarCompensation } =
    useScrollLock();
  const theme = useTheme();
  const { sessionStatus } = useWallet()

  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(
    null
  );
  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    lockScroll();
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    unlockScroll();
    setAnchorEl(null);
  };
  const open = Boolean(anchorEl);
  const id = open ? "notification-menu" : undefined;

  const [currentMenuItems, setCurrentMenuItems] = useState<Notification[]>([]);
  const [numberUnread, setNumberUnread] = useState(0);

  const query = trpc.notification.getNotifications.useQuery(undefined, {
    onSuccess: (data) => {
      setCurrentMenuItems(data);
    },
    enabled: sessionStatus === "authenticated",
  });
  const markAsRead = trpc.notification.markAsRead.useMutation();
  const markAllAsRead = trpc.notification.markAllAsRead.useMutation();

  useEffect(() => {
    const array = currentMenuItems.filter((item) => item.read === false);
    setNumberUnread(array.length);
  }, [currentMenuItems]);

  const setRead = async (i: number) => {
    setCurrentMenuItems((prevArray) => {
      const newArray = prevArray.map((item, index) => {
        if (index === i) {
          return {
            ...item,
            read: !prevArray[index].read,
          };
        }
        return item;
      });
      return newArray;
    });
    const notificationId = currentMenuItems[i].id ?? "";
    try {
      await markAsRead.mutateAsync({ notificationId });
      await query.refetch();
    } catch (e) {
      console.error(e);
    }
  };

  const markAllRead = async () => {
    setCurrentMenuItems((prevArray) => {
      const newArray = prevArray.map((item) => {
        return {
          ...item,
          read: true,
        };
      });
      return newArray;
    });
    try {
      await markAllAsRead.mutateAsync();
      await query.refetch();
    } catch (e) {
      console.error(e);
    }
  };

  const isLg = useMediaQuery("(min-width:534px)");

  const CustomMenuItem: FC<IMenuItemProps> = ({
    icon,
    body,
    href,
    createdAt,
    read,
    index,
  }) => {
    return (
      <MenuItem
        onClick={() => setRead(index)}
        sx={{
          background: !read ? "#161a25" : "none",
          "&:hover": {
            background: !read ? "#212737" : "#212737",
          },
        }}
      >
        <ListItemIcon>{icon}</ListItemIcon>
        <Grid container direction="column" sx={{ whiteSpace: "normal" }}>
          <Grid item>
            <Link href={href ?? undefined}>{body}</Link>{" "}
          </Grid>
          <Grid
            item
            sx={{ fontSize: "0.8rem", color: theme.palette.text.secondary }}
          >
            {createdAt.toUTCString()}
          </Grid>
        </Grid>
        <ListItemIcon>
          <FiberManualRecordIcon
            sx={{
              fontSize: "12px",
              ml: "18px",
              color: !read ? theme.palette.text.primary : "rgba(0,0,0,0)",
            }}
          />
        </ListItemIcon>
      </MenuItem>
    );
  };

  const Contents: FC = () => {
    return (
      <Box
        sx={{
          // minWidth: "420px",
          height: "100%",
          maxWidth: isLg ? "420px" : "534px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Box sx={{ width: "100%", px: "12px", py: "12px", display: "block" }}>
            <Typography variant="h6">Notifications</Typography>
          </Box>
          <Box
            sx={{
              overflowY: "scroll",
              display: "block",
            }}
          >
            <MenuList sx={{ py: 0 }}>
              {currentMenuItems.length > 0 ? (
                currentMenuItems.map((item, i) => {
                  const icon = <PriorityHighIcon fontSize="small" />;
                  if (i < 3) {
                    return (
                      <CustomMenuItem
                        id={item.id}
                        userId={item.userId}
                        createdAt={item.createdAt}
                        body={item.body}
                        href={item.href}
                        read={item.read}
                        icon={icon}
                        key={item.id}
                        index={i}
                      />
                    );
                  }
                })
              ) : (
                <MenuItem>
                  <Typography sx={{ py: 1 }}>
                    Ugh... this looks empty!
                  </Typography>
                </MenuItem>
              )}
            </MenuList>
          </Box>
        </Box>
        <Box
          sx={{
            width: "100%",
            px: "6px",
            py: 1,
            display: "block",
            // position: isLg ? 'relative' : 'absolute',
            bottom: 0,
          }}
          onClick={markAllRead}
        >
          <Button fullWidth>Mark all as read</Button>
        </Box>
      </Box>
    );
  };

  return (
    <>
      <IconButton
        onClick={(e) =>
          isLg
            ? !anchorEl
              ? handleOpen(e)
              : handleClose()
            : dialogOpen
              ? handleDialogClose()
              : handleDialogOpen()
        }
        sx={{
          "&:hover, &.Mui-focusVisible": {
            background: theme.palette.background.hover,
          },
          borderRadius: "8px",
          zIndex: 103,
        }}
      >
        <Badge badgeContent={numberUnread} color="primary">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      <Dialog open={dialogOpen} onClose={() => handleDialogClose()} fullScreen>
        <DialogContent>
          <IconButton
            sx={{
              position: "fixed",
              top: "26px",
              right: isLocked ? `${scrollBarCompensation + 7}px` : "7px",
            }}
            onClick={() => handleDialogClose()}
          >
            <ClearIcon />
          </IconButton>
          <Box
            sx={{
              height: "100%",
              // display: 'flex',
              // alignItems: 'flex-end'
              // width: "100vw",
              // position: "fixed",
              // top: 0,
              // left: 0,
              // bottom: 0,
              // right: 0,
              // zIndex: 100000,
              // background: theme.palette.background.default,
              // mt: "60px",
              // p: "16px",
              // pb: 0,
            }}
          >
            <Contents />
          </Box>
        </DialogContent>
      </Dialog>
      <Popover
        id={id}
        open={open}
        onClose={handleClose}
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        sx={{
          // zIndex: 100,
          mt: "10px",
          "& .MuiPopover-paper": {
            overflow: "hidden",
            background: theme.palette.background.paper,
          },
        }}
      >
        <Contents />
      </Popover>
    </>
  );
};

export default NotificationsMenu;
