import React, { useState } from "react";
import "@styles/globals.css";
import type { AppProps } from "next/app";
import { DarkTheme } from "@theme/theme";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Layout from "@components/layout/Layout";
import Head from "next/head";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { trpc } from "@lib/trpc";
import { SessionProvider } from "next-auth/react";
import { WalletProvider } from "@lib/contexts/WalletContext";
import { useRouter } from "next/router";
import { ScrollLockProvider } from "@contexts/ScrollLockContext";
import RefreshAccessLevel from "@components/user/RefreshAccessLevel";
import { AlertProvider } from "@lib/contexts/AlertContext";
import AlertComponent from "@components/Alert";

function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  const [theme, setTheme] = useState(DarkTheme);
  const router = useRouter();
  const isNoLayoutPage = router.pathname === "/ergopad-chart" || router.pathname.includes('embedded-charts');

  return (
    <>
      <Head>
        <title>Crux Finance</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, minimum-scale=1.0, user-scalable=yes"
        />
      </Head>
      <SessionProvider session={session}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <ThemeProvider theme={theme}>
            <CssBaseline enableColorScheme />
            <AlertProvider>
              <WalletProvider>
                <ScrollLockProvider>
                  <AlertComponent />
                  {isNoLayoutPage ? (
                    <Component {...pageProps} />
                  ) : (
                    <Layout>
                      <Component {...pageProps} />
                    </Layout>
                  )}
                </ScrollLockProvider>
                <RefreshAccessLevel />
              </WalletProvider>
            </AlertProvider>
          </ThemeProvider>
        </LocalizationProvider>
      </SessionProvider>
    </>
  );
}

export default trpc.withTRPC(MyApp);
