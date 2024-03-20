import React, { FC, useState, useEffect, useRef } from "react";
import {
  IconButton,
  useTheme,
  Typography,
  Box,
  Button,
  Badge,
  Popover,
  MenuList,
  MenuItem,
  useMediaQuery,
  Dialog,
  DialogContent,
} from "@mui/material";
import PriorityHighIcon from "@mui/icons-material/PriorityHigh";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import NotificationsIcon from "@mui/icons-material/Notifications";
import ClearIcon from "@mui/icons-material/Clear";
import { useScrollLock } from "@contexts/ScrollLockContext";
import { trpc } from "@lib/trpc";
import { useWallet } from "@contexts/WalletContext";
import Notification from "./Notification";
import { Notification as NotificationType } from "@prisma/client";

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

  const [numberUnread, setNumberUnread] = useState(0);

  const notifications = trpc.notification.getNotifications.useQuery(undefined, {
    enabled: sessionStatus === "authenticated",
  });
  const markAsRead = trpc.notification.markAsRead.useMutation();
  const markAllAsRead = trpc.notification.markAllAsRead.useMutation();

  useEffect(() => {
    if (notifications.data) {
      const array = notifications.data.filter((item) => item.read === false);
      setNumberUnread(array.length);
    }
  }, [notifications.data]);

  const setRead = async (notificationId: string) => {
    try {
      await markAsRead.mutateAsync({ notificationId });
      await notifications.refetch();
    } catch (e) {
      console.error(e);
    }
  };

  const markAllRead = async () => {
    try {
      await markAllAsRead.mutateAsync();
      await notifications.refetch();
    } catch (e) {
      console.error(e);
    }
  };

  const isLg = useMediaQuery("(min-width:534px)");

  const Contents: FC = () => {
    return (
      <Box
        sx={{
          // minWidth: "420px",
          height: "100%",
          maxWidth: isLg ? "620px" : "534px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Box sx={{ width: "100%", px: "12px", py: "12px", display: "block" }}>
            <Typography variant="h6">Notifications</Typography>
          </Box>
          <MenuList sx={{ py: 0 }}>
            {notifications.data && notifications.data.length > 0
              ? [...notifications.data].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                .slice(0, 5) // Then, limit the notifications to the first 3 after sorting
                .map((item) => (
                  <Notification
                    key={item.id}
                    id={item.id}
                    createdAt={item.createdAt}
                    body={item.body}
                    href={item.href ?? undefined}
                    read={item.read}
                    setRead={setRead}
                  />
                ))
              : <MenuItem>
                <Typography sx={{ py: 1 }}>
                  No notifications at this time.
                </Typography>
              </MenuItem>
            }
          </MenuList>

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
