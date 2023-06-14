import React, { FC } from "react";
import {
  Typography,
  Box,
  List,
  ListItem,
  Grid,
  useTheme,
  useMediaQuery
} from "@mui/material";
import { v4 as uuidv4 } from "uuid";

export interface ITimelineItem {
  date: string;
  listItems: string[];
}

interface TimelineProps {
  timeline: ITimelineItem[];
}

const Timeline: FC<TimelineProps> = ({ timeline }) => {
  const theme = useTheme()
  const downSm = useMediaQuery(theme.breakpoints.down("sm"));
  return (
    <Grid container>
      {timeline.map((item, i) => {
        const key = uuidv4();
        return (
          <React.Fragment key={key}>
            <Grid item xs={12} sm={4} sx={{ textAlign: downSm ? 'left' : 'right' }}>
              <Typography variant="h4" sx={{ pr: 4, my: downSm ? 1 : 0 }}>
                {item.date}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={8}>
              <Box sx={{ position: "relative" }}>
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: 0,
                    width: '15px',
                    '&:after': {
                      content: '""',
                      width: '3px',
                      background: theme.palette.text.primary,
                      display: 'block',
                      position: 'absolute',
                      top: downSm ? 0 : '24px',
                      bottom: 0,
                      left: '6px',
                    },
                    ...(!downSm && {
                      '&:before': {
                        background: theme.palette.primary.main,
                        border: '3px solid transparent',
                        borderRadius: '100%',
                        content: '""',
                        display: 'block',
                        height: '15px',
                        position: 'absolute',
                        top: '4px',
                        left: 0,
                        width: '15px',
                        transition: 'background 0.3s ease-in-out, border 0.3s ease-in-out',
                      },
                    }),
                  }}
                ></Box>
                <Box
                  sx={{
                    pl: "32px",
                    pb: !downSm ? 6 : 0,
                    mb: '2px'
                  }}
                >
                  <List>
                    {item.listItems.map((item, i) => {
                      const listItemKey = uuidv4();
                      return <ListItem key={listItemKey} sx={{ ...(i === 0 && { pt: 0 }) }}>{item}</ListItem>;
                    })}
                  </List>
                </Box>
              </Box>
            </Grid>
          </React.Fragment>
        );
      })}
    </Grid >
  );
};

export default Timeline;
