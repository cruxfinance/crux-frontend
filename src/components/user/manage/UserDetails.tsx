import {
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { User } from "@prisma/client";
import { FC, HTMLInputTypeAttribute, useState } from "react";
import ModeEditIcon from "@mui/icons-material/ModeEdit";
import CheckIcon from "@mui/icons-material/Check";
import ClearIcon from "@mui/icons-material/Clear";
import { trpc } from "@lib/trpc";
import { getShortAddress } from "@lib/utils/general";
import { LoadingButton } from "@mui/lab";

interface EditableTextFieldProps {
  name: string;
  type?: HTMLInputTypeAttribute;
  value: string | null;
  onUpdate?: Function;
  hidden?: boolean;
  helperText?: string;
}

const EditableTextField: FC<EditableTextFieldProps> = ({
  name,
  value,
  type,
  onUpdate,
  hidden,
  helperText,
}) => {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up("sm"));
  const [loading, setLoading] = useState<boolean>(false);
  const [edit, setEdit] = useState<boolean>(false);
  const [_value, setValue] = useState<string | null>(value);

  return (
    <>
      {edit ? (
        <Box
          display={desktop ? "flex" : "block"}
          width="100%"
          justifyContent="space-between"
          sx={{ my: 1, mb: !desktop || helperText ? 0 : 2 }}
        >
          <TextField
            type={type}
            label={name}
            variant="outlined"
            value={_value}
            sx={{ width: desktop ? "80%" : "100%" }}
            onChange={(e) => setValue(e.target.value)}
            helperText={helperText}
          />
          {desktop && loading && <CircularProgress sx={{ mt: 1 }} />}
          {desktop && !loading ? (
            <Box>
              <IconButton
                size="small"
                onClick={async () => {
                  setLoading(true);
                  onUpdate && (await onUpdate(_value));
                  setEdit(false);
                  setLoading(false);
                }}
              >
                <CheckIcon fontSize="inherit" />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => {
                  setValue(value);
                  setEdit(false);
                }}
              >
                <ClearIcon fontSize="inherit" />
              </IconButton>
            </Box>
          ) : (
            !desktop && (
              <Box sx={{ mt: 1 }}>
                <LoadingButton
                  sx={{ mr: 1 }}
                  loading={loading}
                  onClick={async () => {
                    setLoading(true);
                    onUpdate && (await onUpdate(_value));
                    setEdit(false);
                    setLoading(false);
                  }}
                >
                  Update
                </LoadingButton>
                <Button
                  onClick={() => {
                    setValue(value);
                    setEdit(false);
                  }}
                >
                  Cancel
                </Button>
              </Box>
            )
          )}
        </Box>
      ) : (
        <Box display="flex" width="100%" justifyContent="space-between">
          <Typography>
            {name}:{" "}
            {value
              ? hidden
                ? value.substring(0, 2) +
                  "***" +
                  value.substring(value.length - 4, value.length)
                : desktop
                ? value
                : getShortAddress(value)
              : "not available"}
          </Typography>
          <IconButton size="small" onClick={() => setEdit(true)}>
            <ModeEditIcon fontSize="inherit" />
          </IconButton>
        </Box>
      )}
    </>
  );
};

interface UserDetailsProps {
  user: User;
}

interface HandleSubmitInput {
  name?: string;
  image?: string;
  email?: string;
}

const UserDetails: FC<UserDetailsProps> = ({ user }) => {
  const queries = trpc.useQueries((t) => [t.user.getUserDetails()]);
  const mutation = trpc.user.changeUserDetails.useMutation();

  const handleSubmit = async (input: HandleSubmitInput) => {
    try {
      await mutation.mutateAsync(input);
      await Promise.all(queries.map((t) => t.refetch()));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6">Personal Details</Typography>
      <Divider sx={{ my: 1 }} />
      <Box display="flex" sx={{ my: 2, px: 1 }}>
        <EditableTextField
          name="Name"
          value={user.name}
          onUpdate={(updateValue: string) =>
            handleSubmit({ name: updateValue })
          }
        />
      </Box>
      <Box display="flex" sx={{ px: 1 }}>
        <EditableTextField
          name="Email"
          type="email"
          value={user.email}
          onUpdate={(updateValue: string) =>
            handleSubmit({ email: updateValue })
          }
          hidden
          helperText="Email will be used for notifcations"
        />
      </Box>
    </Box>
  );
};

export default UserDetails;
