import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, IconButton } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

interface InfoDialogProps {
  title: string;
  contentAsReactNode: React.ReactNode;
}

const InfoDialog: React.FC<InfoDialogProps> = ({
  title, contentAsReactNode
}) => {
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);

  const onClose = () => {
    setInfoDialogOpen(false)
  }

  return (
    <>
      <IconButton
        onClick={() => {
          setInfoDialogOpen(true);
        }}
        sx={{
          borderRadius: "8px",
          height: '24px',
          width: '24px'
        }}
      >
        <InfoOutlinedIcon sx={{ fontSize: 18 }} />
      </IconButton>
      <Dialog
        open={infoDialogOpen}
        onClose={onClose}
        sx={{
          '& .MuiBackdrop-root': {
            backdropFilter: 'blur(3px)',
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
          }
        }}
      >
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          {contentAsReactNode}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center' }}>
          <Button onClick={onClose} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default InfoDialog;