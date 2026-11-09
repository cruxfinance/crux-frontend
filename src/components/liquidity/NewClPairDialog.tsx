import React, { FC, useEffect, useRef, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { ERG_TOKEN_ID } from "@components/cl/clMath";
import type { PickedToken } from "@components/cl/clLiquidity";

const HEX64 = /^[0-9a-fA-F]{64}$/;
const ERG: PickedToken = { id: ERG_TOKEN_ID, name: "ERG", decimals: 9 };

interface SearchResult {
  token_id: string;
  token_name: string;
  token_decimals: number;
}

interface NewClPairDialogProps {
  open: boolean;
  onClose: () => void;
  onContinue: (a: PickedToken, b: PickedToken) => void;
}

type Lookup =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "notFound" };

interface TokenPickerProps {
  label: string;
  value: PickedToken | null;
  onChange: (t: PickedToken | null) => void;
}

/** Search by name or paste a 64-hex token id. */
const TokenPicker: FC<TokenPickerProps> = ({ label, value, onChange }) => {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<PickedToken[]>([]);
  const [lookup, setLookup] = useState<Lookup>({ state: "idle" });
  const seq = useRef(0);

  useEffect(() => {
    const query = input.trim();
    const id = ++seq.current;
    setLookup({ state: "idle" });
    if (value && query === value.name) return;
    const q = query.toLowerCase();
    const ergMatch = q === "erg" || q === "ergo";
    if (HEX64.test(query)) {
      const tokenId = query.toLowerCase();
      if (tokenId === ERG_TOKEN_ID) {
        onChange(ERG);
        return;
      }
      setLookup({ state: "loading" });
      (async () => {
        let found: PickedToken | null = null;
        try {
          const r = await fetch(`${process.env.CRUX_API}/crux/token_info/${tokenId}`);
          if (r.ok) {
            const d = await r.json();
            if (d.token_name) {
              found = { id: tokenId, name: d.token_name, decimals: d.decimals ?? 0 };
            }
          }
        } catch {
          found = null;
        }
        if (seq.current !== id) return;
        if (found) {
          setLookup({ state: "idle" });
          setOptions([found]);
          onChange(found);
        } else {
          setLookup({ state: "notFound" });
        }
      })();
      return;
    }
    if (query.length < 2) {
      setOptions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(
          `${process.env.CRUX_API}/crux/search_tokens?query=${encodeURIComponent(query)}&limit=10`,
        );
        if (!r.ok || seq.current !== id) return;
        const data: SearchResult[] = await r.json();
        // One row per pool of the token: keep the first per token id.
        const byId = new Map<string, PickedToken>();
        for (const t of data) {
          if (!byId.has(t.token_id)) {
            byId.set(t.token_id, { id: t.token_id, name: t.token_name, decimals: t.token_decimals });
          }
        }
        const found = Array.from(byId.values());
        setOptions(ergMatch ? [ERG, ...found.filter((t) => t.id !== ERG_TOKEN_ID)] : found);
      } catch {
        if (seq.current === id) setOptions([]);
      }
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  return (
    <Autocomplete
      options={options}
      value={value}
      inputValue={input}
      onInputChange={(_, v, reason) => {
        if (reason === "input") onChange(null);
        setInput(v);
      }}
      onChange={(_, v) => {
        onChange(v);
        if (v) setInput(v.name);
      }}
      getOptionLabel={(o) => o.name}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      filterOptions={(o) => o}
      noOptionsText={input.trim().length < 2 ? "Type a name or paste a token id" : "No tokens found"}
      renderOption={(props, o) => (
        <li {...props} key={o.id}>
          <Box>
            <Typography variant="body2" sx={{ mb: 0 }}>
              {o.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0 }}>
              {o.id === ERG_TOKEN_ID ? "native token" : `${o.id.slice(0, 8)}…`}
            </Typography>
          </Box>
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          size="small"
          error={lookup.state === "notFound"}
          helperText={
            lookup.state === "notFound"
              ? "Token not found"
              : value
                ? `${value.name} · ${value.decimals} decimals`
                : undefined
          }
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {lookup.state === "loading" && <CircularProgress size={16} />}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
};

/** Pick any two tokens to open the first CL position of a new pair. */
const NewClPairDialog: FC<NewClPairDialogProps> = ({ open, onClose, onContinue }) => {
  const [a, setA] = useState<PickedToken | null>(null);
  const [b, setB] = useState<PickedToken | null>(null);
  const same = !!a && !!b && a.id === b.id;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "16px",
          border: "1px solid rgba(200, 225, 255, 0.08)",
          backgroundImage: "none",
        },
      }}
    >
      <DialogTitle
        sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}
      >
        <Typography variant="h6" fontWeight={700} sx={{ mb: 0 }}>
          New position
        </Typography>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            color: "text.secondary",
            "&:hover": { color: "text.primary", bgcolor: "rgba(255,255,255,0.05)" },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <Box sx={{ px: 3, pb: 3, display: "flex", flexDirection: "column", gap: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0 }}>
          Pick the two tokens of the pair. Search by name or paste a token id.
        </Typography>
        <TokenPicker label="First token" value={a} onChange={setA} />
        <TokenPicker label="Second token" value={b} onChange={setB} />
        {same && <Alert severity="warning">Pick two different tokens.</Alert>}
        <Button
          fullWidth
          variant="contained"
          disabled={!a || !b || same}
          onClick={() => a && b && onContinue(a, b)}
          sx={{ textTransform: "none", fontWeight: 600, borderRadius: "12px", py: 1.25 }}
        >
          Continue
        </Button>
      </Box>
    </Dialog>
  );
};

export default NewClPairDialog;
