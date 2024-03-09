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

export interface IFeature {
  title: string;
  content: React.ReactElement;
  image: string;
  imageAlt: string;
}

export interface IFeatureProps {
  title: string;
  content: React.ReactElement;
  image: string;
  imageAlt: string;
  index: number;
  aspect?: string;
}

const Feature: FC<IFeatureProps> = (props) => {
  const theme = useTheme();
  const upMd = useMediaQuery(theme.breakpoints.up("md"));
  const upSm = useMediaQuery(theme.breakpoints.up("sm"));
  const [ref, inView] = useInView({
    threshold: 0.1,
    triggerOnce: true
  });
  return (
    <Box sx={{ mx: 'auto' }} maxWidth="lg" ref={ref}>
      <Grid
        container
        alignItems="center"
        direction={props.index % 2 === 0 ? "row" : "row-reverse"}
        spacing={3}
        sx={{
          mb: 6,
        }}
      >
        <Slide
          in={inView}
          direction={props.index % 2 === 0 ? "right" : "left"}
          timeout={600}
        >
          <Grid item xs={12} md={6}>
            <Paper
              variant="outlined"
              sx={{
                height: props.aspect !== undefined ? undefined : upSm ? "400px" : "200px",
                aspectRatio: props.aspect,
                // maxWidth: "650px",
                p: upSm ? 2 : 0,
                mx: 'auto'
              }}
            >
              <Box
                sx={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  borderRadius: "12px",
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
          in={inView}
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
