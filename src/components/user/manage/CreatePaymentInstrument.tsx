import { trpc } from "@lib/trpc";
import { checkLocalIcon, getIconUrlFromServer } from "@lib/utils/icons";
import { LoadingButton } from "@mui/lab";
import {
  Avatar,
  Box,
  FormControl,
  InputLabel,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";

interface AllowedToken {
  id: string;
  name: string;
  icon: string | null;
  decimals: number;
}

export const ERG_TOKEN_ID_MAP =
  "0000000000000000000000000000000000000000000000000000000000000000";

export const allowedTokens: AllowedToken[] = [
  {
    id: "0000000000000000000000000000000000000000000000000000000000000000",
    name: "erg",
    icon: null,
    decimals: 9,
  },
  {
    id: "00b42b41cb438c41d0139aa8432eb5eeb70d5a02d3df891f880d5fe08670c365",
    name: "CRUX",
    icon: null,
    decimals: 4,
  },
];

export const getIcon = async (id: string) => {
  // Check for the icon locally first
  let url = await checkLocalIcon(id);
  // Otherwise, check the server for it
  if (!url) {
    url = await getIconUrlFromServer(id);
  }
  return url;
};

const CreatePaymentInstrument = () => {
  const [token, setToken] = useState(ERG_TOKEN_ID_MAP);
  const [tokenList, setTokenList] = useState(allowedTokens);
  const [loading, setLoading] = useState(false);
  const mutatePaymentInstrument =
    trpc.subscription.createPaymentInstrument.useMutation();
  const queries = trpc.useQueries((t) => [
    t.subscription.findPaymentInstruments(),
  ]);

  useEffect(() => {
    const resolveIcons = async () => {
      try {
        const iconPromises = tokenList.map((token) => getIcon(token.id));
        const icons = await Promise.all(iconPromises);
        setTokenList(
          tokenList.map((token, index) => {
            return {
              ...token,
              icon: icons[index],
            };
          })
        );
      } catch (e) {
        console.error(e);
      }
    };

    resolveIcons();
  }, []);

  const createPaymentInstrument = async () => {
    setLoading(true);
    try {
      await mutatePaymentInstrument.mutateAsync({
        tokenId: token === ERG_TOKEN_ID_MAP ? undefined : token,
      });
      await Promise.all(queries.map((query) => query.refetch()));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <Paper sx={{ p: 3, width: "100%", position: "relative", pb: 4 }}>
      <Typography variant="h6">Add a new currency</Typography>
      <Box sx={{ width: "50%" }}>
        <FormControl fullWidth sx={{ mt: 2, mb: 3 }}>
          <InputLabel id="token-select-label">Token</InputLabel>
          <Select
            labelId="token-select-label"
            id="token-select"
            value={token}
            label="Token"
            SelectDisplayProps={{
              style: { display: "flex", alignItems: "center" },
            }}
            onChange={(e) => setToken(e.target.value as string)}
          >
            {tokenList.map((allowedToken) => (
              <MenuItem value={allowedToken.id} key={allowedToken.id}>
                <ListItemIcon>
                  <Avatar
                    src={allowedToken.icon ?? ""}
                    sx={{ width: "24px", height: "24px" }}
                  />
                </ListItemIcon>
                <ListItemText>{allowedToken.name}</ListItemText>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <LoadingButton
          variant="outlined"
          onClick={createPaymentInstrument}
          loading={loading}
        >
          Create Payment Instrument
        </LoadingButton>
      </Box>
    </Paper>
  );
};

export default CreatePaymentInstrument;
