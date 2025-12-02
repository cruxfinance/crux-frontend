import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';

export default function SkeletonTrending() {
  return (
    <Box>
      {[1, 2, 3].map((i) => (
        <Box
          key={i}
          display="flex"
          alignItems="center"
          gap={1}
          px={1}
          py={0.5}
          borderRadius={1}
          mb={0.5}
        >
          {/* index number */}
          <Skeleton
            variant="circular"
            width={20}
            height={20}
            animation="wave"
          />

          {/* avatar */}
          <Skeleton
            variant="circular"
            width={24}
            height={24}
            animation="wave"
          />

          {/* single line name placeholder */}
          <Box flex={1}>
            <Skeleton
              variant="rectangular"
              width="80%"
              height={12}
              animation="wave"
              sx={{ borderRadius: 1 }}
            />
          </Box>
        </Box>
      ))}
    </Box>
  );
}
