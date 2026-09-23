import React, { FC, useState } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  TextField,
  Button,
  CircularProgress,
  Grid,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useAlert } from "@contexts/AlertContext";
import { useMinerFee } from "@contexts/MinerFeeContext";

declare global {
  interface Window {
    ergoConnector: any;
  }
}

interface DevMintPanelProps {
  userAddresses: string[];
  onMinted: () => void;
}

interface MintTestTokenResponse {
  unsigned_tx: any;
  token_id?: string;
  error?: string;
}

/** POSTs `body` to `path` and returns the parsed JSON, throwing an Error
 * with the API's `{ error }` message (or a generic fallback) on failure. */
async function apiJson<T>(path: string, body: object): Promise<T> {
  const response = await fetch(`${process.env.CRUX_API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let data: any = null;
  try {
    data = await response.json();
  } catch {
    // non-JSON body, fall through to status-based error below
  }
  if (!response.ok) {
    throw new Error(data?.error || `Request failed (${response.status})`);
  }
  if (data?.error) {
    throw new Error(data.error);
  }
  return data as T;
}

const DevMintPanel: FC<DevMintPanelProps> = ({ userAddresses, onMinted }) => {
  const { addAlert } = useAlert();
  const { minerFee } = useMinerFee();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [decimals, setDecimals] = useState("0");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleMint = async () => {
    if (!window.ergoConnector?.nautilus) {
      addAlert("error", "Please connect Nautilus wallet");
      return;
    }
    if (userAddresses.length === 0) {
      addAlert("error", "No wallet addresses found");
      return;
    }

    const decimalsNum = parseInt(decimals, 10);
    const amountNum = parseFloat(amount);

    if (!name.trim()) {
      addAlert("error", "Enter a token name");
      return;
    }
    if (isNaN(decimalsNum) || decimalsNum < 0 || decimalsNum > 18) {
      addAlert("error", "Decimals must be between 0 and 18");
      return;
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      addAlert("error", "Enter a positive amount");
      return;
    }

    setSubmitting(true);
    try {
      const rawAmount = Math.round(amountNum * Math.pow(10, decimalsNum));
      const result = await apiJson<MintTestTokenResponse>(
        "/dex/cl/mint_test_token",
        {
          user_addresses: userAddresses,
          name: name.trim(),
          description: description.trim(),
          decimals: decimalsNum,
          amount: rawAmount,
          miner_fee: minerFee,
        },
      );

      const ergoCnct = window.ergoConnector.nautilus;
      const context = await ergoCnct.getContext();
      const signedTx = await context.sign_tx(result.unsigned_tx);
      const txId = await context.submit_tx(signedTx);

      addAlert(
        "success",
        `Test token minted! TX: ${txId.slice(0, 8)}...${
          result.token_id ? ` Token id: ${result.token_id.slice(0, 8)}...` : ""
        }`,
      );
      setName("");
      setDescription("");
      setAmount("");
      onMinted();
    } catch (error: any) {
      console.error("Mint test token error:", error);
      addAlert("error", error.message || "Failed to mint test token");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Accordion sx={{ backgroundImage: "none" }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle1" sx={{ mb: 0 }}>
          Dev: Mint Test Token
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Mints an EIP-4 token to your first wallet address. Only enabled on
          ci-api when <code>CL_DEV_ENDPOINTS=true</code>.
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Name"
              fullWidth
              size="small"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Description"
              fullWidth
              size="small"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField
              label="Decimals"
              type="number"
              fullWidth
              size="small"
              value={decimals}
              onChange={(e) => setDecimals(e.target.value)}
              inputProps={{ min: 0, max: 18, step: 1 }}
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField
              label="Amount"
              type="number"
              fullWidth
              size="small"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              helperText="Human units"
            />
          </Grid>
        </Grid>
        <Box sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            onClick={handleMint}
            disabled={submitting}
            startIcon={
              submitting ? <CircularProgress size={16} color="inherit" /> : null
            }
          >
            {submitting ? "Minting..." : "Mint Test Token"}
          </Button>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};

export default DevMintPanel;
