import React, { FC } from "react";
import {
  Typography,
  useTheme,
  useMediaQuery,
  Grid,
  Box,
  Paper,
  Slide,
} from "@mui/material";
import { useInView } from "react-intersection-observer";
import Image from "next/image";

const inViewOptions = {
  threshold: 1,
  triggerOnce: true
};

interface IFeatureProps {
  title: string;
  content: React.ReactElement;
  image: string;
  imageAlt: string;
  index: number;
}

const Feature: FC<IFeatureProps> = (props) => {
  const theme = useTheme();
  const upMd = useMediaQuery(theme.breakpoints.up("md"));
  const upSm = useMediaQuery(theme.breakpoints.up("sm"));
  const [ref, inView] = useInView(inViewOptions);
  return (
    <Box sx={{ mx: 'auto' }} maxWidth="lg">
      <Grid
        container

        alignItems="center"
        direction={props.index % 2 === 0 ? "row" : "row-reverse"}
        spacing={3}
        sx={{
          mb: 6,
        }}
        ref={ref}
      >
        <Slide
          in={upMd ? inView : true}
          direction={props.index % 2 === 0 ? "right" : "left"}
          timeout={600}
        >
          <Grid item xs={12} md={6}>
            <Paper
              sx={{
                height: upSm ? "400px" : "200px",
                maxWidth: "550px",
                p: upSm ? 2 : 0,
                mx: 'auto'
              }}
            >
              <Box
                sx={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  borderRadius: "20px",
                  overflow: "hidden",
                }}
              >
                <Image
                  src={props.image}
                  fill={true}
                  alt={props.imageAlt ? props.imageAlt : "UI Image"}
                  style={{ objectFit: "cover" }}
                />
              </Box>
            </Paper>
          </Grid>
        </Slide>
        <Slide
          in={upMd ? inView : true}
          direction={props.index % 2 === 0 ? "left" : "right"}
          timeout={300}
        >
          <Grid item xs={12} md={6}>
            <Typography variant="h4" fontWeight={700}>
              {props.title}
            </Typography>
            {props.content}
          </Grid>
        </Slide>
      </Grid>
    </Box>
  );
};

export default Feature;
