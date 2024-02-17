import SideMenu from "@components/layout/SideMenu";
import {
  Avatar,
  Box,
  CircularProgress,
  Paper,
  Typography,
  Button,
} from "@mui/material";
import { NextPage } from "next";
import userNavItems from "@lib/navigation/userNav";
import { useState } from "react";
import { User, UserPrivilegeLevel } from "@prisma/client";
import { trpc } from "@lib/trpc";
import UserDetails from "@components/user/manage/UserDetails";
import UploadFileDialog from "@components/UploadFileDialog";

const UserProfile: NextPage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [openDialog, setOpenDialog] = useState<boolean>(false);

  const mutation = trpc.user.changeUserDetails.useMutation();
  const query = trpc.user.getUserDetails.useQuery(undefined, {
    onSuccess: (data) => {
      setUser(data);
      setLoading(false);
    },
  });

  const handleImageUpdate = async (fileUrl: string) => {
    try {
      await mutation.mutateAsync({ image: fileUrl });
      await query.refetch();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <SideMenu title="Settings" navItems={userNavItems}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        User Profile
      </Typography>
      <Paper sx={{ p: 3 }}>
        {loading && (
          <Box display="flex" justifyContent="center" sx={{ p: 2 }}>
            <CircularProgress />
          </Box>
        )}
        {user && (
          <>
            <Box display="flex">
              <Avatar
                alt="Default Image"
                sx={{ width: 84, height: 84, mr: 2 }}
                src={user.image ?? undefined}
              />
              <Box sx={{ pt: 1 }}>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {user.name ?? user.defaultAddress}
                </Typography>
                <Button variant="outlined" onClick={() => setOpenDialog(true)}>
                  Update Image
                </Button>
              </Box>
            </Box>
            <Typography variant="body2" sx={{ mt: 2 }}>
              Subscription Status:{" "}
              {user.privilegeLevel === UserPrivilegeLevel.DEFAULT
                ? "not available"
                : user.privilegeLevel}
            </Typography>
            <UserDetails user={user} />
          </>
        )}
      </Paper>
      <UploadFileDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        handleFileUrl={(fileUrl: string) => handleImageUpdate(fileUrl)}
      />
    </SideMenu>
  );
};

export default UserProfile;
