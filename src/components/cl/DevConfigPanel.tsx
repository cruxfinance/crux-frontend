import React, { FC, useEffect, useState } from "react";
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
  IconButton,
  Tooltip,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useAlert } from "@contexts/AlertContext";
import { useMinerFee } from "@contexts/MinerFeeContext";
import { copyToClipboard } from "@lib/utils/clipboard";
import { submitSignedTx } from "./walletTokens";

declare global {
  interface Window {
    ergoConnector: any;
  }
}

interface DevConfigPanelProps {
  userAddresses: string[];
}

/** Response shape of `POST /dex/cl/dev/create_config` -- see ci-api's
 * `entities::cl::ClCreateConfigResponse`. */
interface ClConfigValuesDto {
  receiver_address: string;
  signer_addresses: string[];
  threshold: number;
  phi: number;
  floor_bps: number;
  value_nanoerg: number;
}

interface ClCreateConfigResponse {
  unsigned_tx: any;
  config_nft_id: string;
  config_box_values: ClConfigValuesDto;
  error?: string;
}

const DEFAULT_THRESHOLD = "1";
const DEFAULT_PHI = "1667";
const DEFAULT_FLOOR_BPS = "1";
const DEFAULT_VALUE_ERG = "1";

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

/** Splits a signer-addresses textarea (one address per line, or
 * comma-separated) into a trimmed, non-empty list. */
function parseSignerAddresses(text: string): string[] {
  return text
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

const DevConfigPanel: FC<DevConfigPanelProps> = ({ userAddresses }) => {
  const { addAlert } = useAlert();
  const { minerFee } = useMinerFee();

  const [receiverAddress, setReceiverAddress] = useState("");
  const [receiverTouched, setReceiverTouched] = useState(false);
  const [signerAddressesText, setSignerAddressesText] = useState("");
  const [signersTouched, setSignersTouched] = useState(false);
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [phi, setPhi] = useState(DEFAULT_PHI);
  const [floorBps, setFloorBps] = useState(DEFAULT_FLOOR_BPS);
  const [valueErg, setValueErg] = useState(DEFAULT_VALUE_ERG);
  const [submitting, setSubmitting] = useState(false);
  const [configNftId, setConfigNftId] = useState<string | null>(null);

  // Prefill the receiver + first signer from the connected wallet, but only
  // until the user edits either field themselves.
  useEffect(() => {
    if (userAddresses.length === 0) return;
    if (!receiverTouched) setReceiverAddress(userAddresses[0]);
    if (!signersTouched) setSignerAddressesText(userAddresses[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userAddresses]);

  const handleCreateConfig = async () => {
    if (!window.ergoConnector?.nautilus) {
      addAlert("error", "Please connect Nautilus wallet");
      return;
    }
    if (userAddresses.length === 0) {
      addAlert("error", "No wallet addresses found");
      return;
    }

    const thresholdNum = parseInt(threshold, 10);
    const phiNum = parseInt(phi, 10);
    const floorBpsNum = parseInt(floorBps, 10);
    const valueErgNum = parseFloat(valueErg);
    const signerAddresses = parseSignerAddresses(signerAddressesText);

    if (isNaN(thresholdNum) || thresholdNum < 1) {
      addAlert("error", "Threshold must be a positive integer");
      return;
    }
    if (signerAddresses.length === 0) {
      addAlert("error", "Enter at least one signer address");
      return;
    }
    if (thresholdNum > signerAddresses.length) {
      addAlert("error", "Threshold cannot exceed the number of signers");
      return;
    }
    if (isNaN(phiNum) || phiNum < 0) {
      addAlert("error", "phi must be a non-negative integer");
      return;
    }
    if (isNaN(floorBpsNum) || floorBpsNum < 0) {
      addAlert("error", "floor_bps must be a non-negative integer");
      return;
    }
    if (isNaN(valueErgNum) || valueErgNum <= 0) {
      addAlert("error", "Value must be a positive amount of ERG");
      return;
    }

    setSubmitting(true);
    try {
      const result = await apiJson<ClCreateConfigResponse>(
        "/dex/cl/dev/create_config",
        {
          user_addresses: userAddresses,
          receiver_address: receiverAddress.trim() || undefined,
          signer_addresses: signerAddresses,
          threshold: thresholdNum,
          phi: phiNum,
          floor_bps: floorBpsNum,
          value_nanoerg: Math.round(valueErgNum * 1_000_000_000),
          miner_fee: minerFee,
        },
      );

      const ergoCnct = window.ergoConnector.nautilus;
      const context = await ergoCnct.getContext();
      const signedTx = await context.sign_tx(result.unsigned_tx);
      const txId = await submitSignedTx(context, signedTx);

      setConfigNftId(result.config_nft_id);
      addAlert(
        "success",
        `Config box created! TX: ${txId.slice(0, 8)}... Config NFT id: ${result.config_nft_id.slice(0, 8)}...`,
      );
    } catch (error: any) {
      console.error("Create protocol config error:", error);
      addAlert("error", error.message || "Failed to create protocol config");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyNftId = async () => {
    if (!configNftId) return;
    const copied = await copyToClipboard(configNftId);
    addAlert(copied ? "success" : "error", copied ? "Config NFT id copied" : "Failed to copy");
  };

  return (
    <Accordion sx={{ backgroundImage: "none" }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle1" sx={{ mb: 0 }}>
          Dev: Create Protocol Config (Staging)
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Mints the CL protocol-fee config box&apos;s NFT and creates the config
          box itself. The config script is network-independent, so this
          works even before this network has a CL deployment. Only enabled
          on ci-api when <code>CL_DEV_ENDPOINTS=true</code>.
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              label="Receiver address"
              fullWidth
              size="small"
              value={receiverAddress}
              onChange={(e) => {
                setReceiverAddress(e.target.value);
                setReceiverTouched(true);
              }}
              helperText="Protocol fees are paid to this address' script"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Signer addresses"
              fullWidth
              multiline
              minRows={2}
              size="small"
              value={signerAddressesText}
              onChange={(e) => {
                setSignerAddressesText(e.target.value);
                setSignersTouched(true);
              }}
              helperText="One P2PK address per line (or comma-separated) -- their public keys become the config's governing multisig"
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField
              label="Threshold"
              type="number"
              fullWidth
              size="small"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              inputProps={{ min: 1, step: 1 }}
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField
              label="phi (/ 10000)"
              type="number"
              fullWidth
              size="small"
              value={phi}
              onChange={(e) => setPhi(e.target.value)}
              inputProps={{ min: 0, step: 1 }}
              helperText="1667 = 1/6"
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField
              label="Floor (bps)"
              type="number"
              fullWidth
              size="small"
              value={floorBps}
              onChange={(e) => setFloorBps(e.target.value)}
              inputProps={{ min: 0, step: 1 }}
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField
              label="Value (ERG)"
              type="number"
              fullWidth
              size="small"
              value={valueErg}
              onChange={(e) => setValueErg(e.target.value)}
              inputProps={{ min: 1, step: 0.1 }}
              helperText="Must be >= 1 ERG"
            />
          </Grid>
        </Grid>
        <Box sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            onClick={handleCreateConfig}
            disabled={submitting}
            startIcon={
              submitting ? <CircularProgress size={16} color="inherit" /> : null
            }
          >
            {submitting ? "Creating..." : "Create Protocol Config"}
          </Button>
        </Box>
        {configNftId && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: "bold" }}>
              Config NFT id
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
                {configNftId}
              </Typography>
              <Tooltip title="Copy config NFT id">
                <IconButton size="small" sx={{ p: 0.25 }} onClick={handleCopyNftId}>
                  <ContentCopyIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            </Box>
            <Typography variant="caption" color="text.secondary">
              Add this id as <code>[mainnet-staging] config_nft_id</code> in
              crux-boxes&apos; <code>cl-deployments.toml</code>.
            </Typography>
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

export default DevConfigPanel;
