import React, { FC, useState } from "react";
import {
  Box,
  Paper,
  Tabs,
  Tab,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import RecentTradesPanel from "./RecentTradesPanel";
import OpenOrdersPanel from "./OpenOrdersPanel";
import OrderHistoryPanel from "./OrderHistoryPanel";

interface TokenInfo {
  tokenId: string;
  name: string;
  ticker: string;
  icon: string;
  decimals: number;
  price: number;
}

interface TradeTabsPanelProps {
  baseToken: TokenInfo | null;
  quoteToken: TokenInfo;
  ergPrice: number;
  onTradeClick?: (price: number, amount?: number) => void;
  orderRefreshTrigger: number;
  userAddresses: string[];
  onOpenOrderCountChange?: (count: number) => void;
  onOrderHistoryCountChange?: (count: number) => void;
}

type TabValue = "trades" | "open" | "history";

const TradeTabsPanel: FC<TradeTabsPanelProps> = ({
  baseToken,
  quoteToken,
  ergPrice,
  onTradeClick,
  orderRefreshTrigger,
  userAddresses,
  onOpenOrderCountChange,
  onOrderHistoryCountChange,
}) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<TabValue>("trades");

  const handleTabChange = (_: React.SyntheticEvent, value: TabValue) => {
    setActiveTab(value);
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        flex: 1,
        transition: "border-color 0.2s",
        "&:hover": {
          borderColor: "rgba(254,107,139,0.35)",
        },
      }}
    >
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        variant="fullWidth"
        aria-label="Trade activity tabs"
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          flexShrink: 0,
        }}
      >
        <Tab value="trades" label="Recent Trades" id="tab-trades" aria-controls="panel-trades" />
        <Tab value="open" label="Open Orders" id="tab-open" aria-controls="panel-open" />
        <Tab value="history" label="Order History" id="tab-history" aria-controls="panel-history" />
      </Tabs>
      <Box sx={{ flex: 1, overflow: "auto", minHeight: 0, p: activeTab === "trades" ? 0 : 2 }}>
        {activeTab === "trades" && (
          <div key="panel-trades" role="tabpanel" id="panel-trades" aria-labelledby="tab-trades">
            <RecentTradesPanel
              baseToken={baseToken}
              quoteToken={quoteToken}
              ergPrice={ergPrice}
              onTradeClick={onTradeClick}
              noPaper
            />
          </div>
        )}
        {activeTab === "open" && (
          <div key="panel-open" role="tabpanel" id="panel-open" aria-labelledby="tab-open">
            <OpenOrdersPanel
              baseToken={baseToken}
              quoteToken={quoteToken}
              refreshTrigger={orderRefreshTrigger}
              onCountChange={onOpenOrderCountChange}
              userAddresses={userAddresses}
            />
          </div>
        )}
        {activeTab === "history" && (
          <div key="panel-history" role="tabpanel" id="panel-history" aria-labelledby="tab-history">
            <OrderHistoryPanel
              baseToken={baseToken}
              quoteToken={quoteToken}
              onCountChange={onOrderHistoryCountChange}
              userAddresses={userAddresses}
            />
          </div>
        )}
      </Box>
    </Paper>
  );
};

export default TradeTabsPanel;
