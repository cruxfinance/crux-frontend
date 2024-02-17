import { trpc } from "@lib/trpc";
import { LoadingButton } from "@mui/lab";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  styled,
} from "@mui/material";
import { ChangeEvent, FC, useState } from "react";

const VisuallyHiddenInput = styled("input")({
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: 1,
  overflow: "hidden",
  position: "absolute",
  bottom: 0,
  left: 0,
  whiteSpace: "nowrap",
  width: 1,
});

interface UploadFileDialogProps {
  open: boolean;
  onClose: Function;
  handleFileUrl: Function;
}

const UploadFileDialog: FC<UploadFileDialogProps> = ({
  open,
  onClose,
  handleFileUrl,
}) => {
  const [currentFile, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const mutation = trpc.user.uploadFile.useMutation();

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.target.files?.[0] ?? null;
    setFile(file);
  };

  const toBase64 = (file: File) =>
    new Promise<string | ArrayBuffer | null>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
    });

  const handleFileUpload = async () => {
    if (!currentFile) {
      return;
    }
    setLoading(true);
    try {
      // @ts-ignore
      const data: string = await toBase64(currentFile);
      const response = await mutation.mutateAsync({
        fileName: currentFile.name,
        encodedFile: data,
      });
      handleFileUrl(response.fileUrl);
      onClose()
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <Dialog
      open={open}
      onClose={() => onClose()}
      aria-labelledby="Dialog-Dialog-title"
      aria-describedby="Dialog-Dialog-description"
    >
      <DialogTitle>Upload File</DialogTitle>
      <DialogContent>
        Choose the file to upload or use the drag and drop below.
      </DialogContent>
      <DialogContent>
        <Paper
          sx={{
            mt: -2,
            height: "120px",
            border: "dashed",
            borderColor: "text.secondary",
          }}
        >
          <Button
            tabIndex={-1}
            sx={{ height: "100%", width: "100%" }}
            component="label"
          >
            {currentFile === null
              ? "Select File"
              : `Selected file: ${currentFile.name}`}
            <VisuallyHiddenInput
              type="file"
              onChange={(e) => handleFileSelect(e)}
            />
          </Button>
        </Paper>
      </DialogContent>
      <DialogActions sx={{ pb: 2 }}>
        <LoadingButton
          loading={loading}
          variant="contained"
          onClick={() => handleFileUpload()}
        >
          Upload
        </LoadingButton>
        <Button onClick={() => onClose()}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

export default UploadFileDialog;
