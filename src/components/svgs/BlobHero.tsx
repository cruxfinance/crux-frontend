import React, { FC } from "react";
// import SvgIcon from "@mui/material/SvgIcon";
import { Box, SxProps } from "@mui/material";

const BlobHero: FC<{ sx?: SxProps }> = ({ sx }) => {
  return (
    <Box sx={{ ...sx }}>
      <svg width="2055" height="1292" viewBox="0 0 2055 1292" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g filter="url(#filter0_f_302_38)">
          <path fillRule="evenodd" clipRule="evenodd" d="M741.382 92.8078C812.326 75.2328 891.814 44.8935 952.195 86.0779C1013.27 127.734 1010.34 214.097 1025.33 286.487C1041.61 365.092 1085.38 450.319 1041.56 517.572C996.973 585.985 902.484 603.101 820.877 600.222C752.221 597.801 703.15 544.262 647.719 503.68C592.476 463.235 518.465 435.079 503.927 368.174C489 299.478 531.257 232.223 577.166 178.984C619.133 130.316 679.003 108.261 741.382 92.8078Z" fill="#FF7038" fillOpacity="0.25" />
        </g>
        <g filter="url(#filter1_f_302_38)">
          <path fillRule="evenodd" clipRule="evenodd" d="M1314.04 283.808C1243.09 266.233 1163.6 235.893 1103.22 277.078C1042.15 318.734 1045.08 405.097 1030.09 477.487C1013.81 556.092 970.035 641.319 1013.86 708.572C1058.45 776.985 1152.93 794.101 1234.54 791.222C1303.2 788.801 1352.27 735.262 1407.7 694.68C1462.94 654.235 1536.95 626.079 1551.49 559.174C1566.42 490.478 1524.16 423.223 1478.25 369.984C1436.29 321.316 1376.42 299.261 1314.04 283.808Z" fill="#FF2E84" fillOpacity="0.25" />
        </g>
        <defs>
          <filter id="filter0_f_302_38" x="0.873047" y="-434.532" width="1559.62" height="1535.05" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
            <feGaussianBlur stdDeviation="250" result="effect1_foregroundBlur_302_38" />
          </filter>
          <filter id="filter1_f_302_38" x="494.925" y="-243.532" width="1559.62" height="1535.05" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
            <feGaussianBlur stdDeviation="250" result="effect1_foregroundBlur_302_38" />
          </filter>
        </defs>
      </svg>
    </Box>
  );
};

export default BlobHero;
