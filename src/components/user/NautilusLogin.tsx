import React, { useEffect, useState, FC } from "react";
import { z } from "zod";
import QRCode from "react-qr-code";
import {
  Box,
  Button,
  CircularProgress,
  Input,
  LinearProgress,
  Typography,
  useTheme,
} from "@mui/material";
import Link from "@components/Link";
import { WalletContext } from "@contexts/WalletContext";
import { useRouter } from "next/router";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import Divider from "@mui/material/Divider";
import Settings from "@mui/icons-material/Settings";
import Logout from "@mui/icons-material/Logout";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import RedeemIcon from "@mui/icons-material/Redeem";
import SellIcon from "@mui/icons-material/Sell";
import EditIcon from "@mui/icons-material/Edit";
import SignIn, { Expanded } from "@components/user/SignIn";
import { trpc } from "@lib/trpc";
import { signIn, signOut } from "next-auth/react";
import nautilusIcon from "@public/icons/nautilus.png";

interface INautilusLogin {
  expanded: Expanded;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  localLoading: boolean;
  setLocalLoading: React.Dispatch<React.SetStateAction<boolean>>;
  dappConnected: boolean;
  setDappConnected: React.Dispatch<React.SetStateAction<boolean>>;
  setModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const NautilusLogin: FC<INautilusLogin> = ({
  setLoading,
  localLoading,
  setLocalLoading,
  setModalOpen,
  dappConnected,
  setDappConnected,
}) => {
  return <></>;
};

export default NautilusLogin;
