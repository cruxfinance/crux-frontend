import React, { FC } from "react";
import {
  useTheme,
  Grid,
  MenuItem,
  ListItemIcon,
  Typography
} from "@mui/material";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import Link from "next/link";
import NotificationsIcon from '@mui/icons-material/Notifications';

interface IMenuItemProps {
  body: string;
  id: string;
  href?: string;
  createdAt: Date;
  read: boolean;
  setRead: (id: string) => void;
}

const Notification: FC<IMenuItemProps> = ({
  body,
  href,
  id,
  createdAt,
  read,
  setRead
}) => {
  const theme = useTheme();
  const icon = <NotificationsIcon fontSize="small" />;

  return (
    <MenuItem
      onClick={() => setRead(id)}
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
          {href
            ? <Link href={href}>
              <Typography sx={{ fontWeight: 700 }} >
                {body}

              </Typography>
            </Link>
            : <Typography sx={{ fontWeight: 700 }}>
              {body}
            </Typography>
          }

        </Grid>
        <Grid
          item
          sx={{ fontSize: "0.8rem", color: theme.palette.text.secondary }}
        >
          {createdAt.toLocaleString()}
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

export default Notification;