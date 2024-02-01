import { FC } from 'react';
import {
  Container,
  Typography,
  Link,
  Paper
  // useTheme,
  // useMediaQuery
} from '@mui/material';
import SideMenu from '@components/layout/SideMenu'
import { NextPage } from 'next';
import accountingNavItems from '@lib/navigation/accountingNav';

const Accounting: NextPage = () => {
  // const theme = useTheme()
  // const upSm = useMediaQuery(theme.breakpoints.up('sm'))
  return (
    <SideMenu title="Accounting" navItems={accountingNavItems}>
      <Paper sx={{ p: 3, width: "100%", position: "relative", mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
          Your reports
        </Typography>
        <Link href="/">
          <Typography>
            Go Back Home
          </Typography>
        </Link>
      </Paper>
    </SideMenu>
  )
}

export default Accounting
