import React, { FC } from "react";
import { Typography, Box, IconButton } from "@mui/material";
import Link from "@components/Link";
import QRCode from "react-qr-code";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useAlert } from "@contexts/AlertContext";

interface IErgopayQrCodeProps {
  url: string;
}

const ErgopayQrCode: FC<IErgopayQrCodeProps> = ({ url }) => {
  const { addAlert } = useAlert();

  const copyToClipboard = (link: string) => {
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(link)
        .then(() => {
          addAlert("success", "Link copied to clipboard!");
        })
        .catch((err) => {
          addAlert("error", `Failed to copy link: ${err}`);
        });
    } else {
      // Fallback using document.execCommand (less reliable and secure)
      try {
        const textarea = document.createElement("textarea");
        textarea.value = link;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        addAlert("success", "Link copied to clipboard!");
      } catch (err) {
        addAlert("error", `Failed to copy link: ${err}`);
      }
    }
  };

  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <Box sx={{ mb: 2 }}>
        <Typography>
          Scan the QR code or follow <Link href={url}>this link</Link> to
          complete the payment.
          <IconButton onClick={() => copyToClipboard(url)}>
            <ContentCopyIcon sx={{ height: "18px", width: "18px" }} />
          </IconButton>
        </Typography>
      </Box>
      <Box sx={{ background: "#fff", p: 3, mb: 2, borderRadius: "12px" }}>
        <QRCode
          size={180}
          value={url}
          style={{ height: "auto", maxWidth: "100%", width: "100%" }}
          viewBox={`0 0 256 256`}
        />
      </Box>
    </Box>
  );
};

export default ErgopayQrCode;
