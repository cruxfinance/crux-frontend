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
import AlertWrapper, { IAlertMessages } from "@components/AlertWrapper";
import { trpc } from "@lib/trpc";

function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  const [theme, setTheme] = useState(DarkTheme);
  const [alert, setAlert] = useState<IAlertMessages[]>([]);

  return (
    <>
      <Head>
        <title>Crux Finance</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, minimum-scale=1.0, user-scalable=yes"
        />
      </Head>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <ThemeProvider theme={theme}>
          {/* <ThemeContext.Provider value={{ theme, setTheme }}> */}
          <CssBaseline enableColorScheme />
          <Layout>
            <Component {...pageProps} />
          </Layout>
          <AlertWrapper
            alerts={alert}
            close={(i: number) => {
              setAlert((prevState) =>
                prevState.filter((_item, idx) => idx !== i)
              );
            }}
          />
          {/* </ThemeContext.Provider> */}
        </ThemeProvider>
      </LocalizationProvider>
    </>
  );
}

export default trpc.withTRPC(MyApp);
