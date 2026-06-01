import { FC } from "react";
import SvgIcon, { SvgIconProps } from "@mui/material/SvgIcon";

const Logo: FC<SvgIconProps> = (props) => {
  return (
    <SvgIcon
      width="522"
      height="518"
      viewBox="0 0 522 518"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
      sx={{ fontSize: '48px', ...props.sx }}
    >
      <path d="M288.544 51.0627L288.544 227.949L441.732 139.506L288.544 51.0627Z" />
      <path d="M256.867 51.0628L256.867 227.949L103.679 139.506L256.867 51.0628Z" />
      <path d="M88.4432 170.056L241.631 258.499L88.4432 346.943L88.4432 170.056Z" />
      <path d="M256.867 289.809L103.679 378.252L256.867 466.695L256.867 289.809Z" />
      <path d="M294.247 289.809L447.435 378.252L294.247 466.695L294.247 289.809Z" />
    </SvgIcon>
  );
};

export default Logo;