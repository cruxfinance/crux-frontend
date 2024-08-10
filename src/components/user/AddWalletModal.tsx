import React, { FC, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
} from "@mui/material";
import AddNautilus from "./AddNautilus";
import AddMobile from "./AddMobile";

interface AddWalletProps {
  open: boolean;
  setModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  customTitle?: string;
}

export type AddWalletExpanded = "mobile" | "nautilus" | undefined;

const AddWalletModal: FC<AddWalletProps> = ({
  open,
  setModalOpen,
  setLoading,
  customTitle,
}) => {
  const [expanded, setExpanded] = useState<AddWalletExpanded>(undefined);
  return (
    <Dialog open={open}
      sx={{
        '& .MuiBackdrop-root': {
          backdropFilter: 'blur(3px)',
          backgroundColor: 'rgba(0, 0, 0, 0.5)'
        }
      }}
    >
      <DialogTitle>
        {customTitle ? customTitle : "Add a wallet to your account"}
      </DialogTitle>
      <DialogContent>
        <Box>
          <AddNautilus
            setModalOpen={setModalOpen}
            setExpanded={setExpanded}
            expanded={expanded}
          />
        </Box>
        <Box>
          <AddMobile
            setModalOpen={setModalOpen}
            setExpanded={setExpanded}
            expanded={expanded}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            setModalOpen(false);
            setExpanded(undefined);
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddWalletModal;
