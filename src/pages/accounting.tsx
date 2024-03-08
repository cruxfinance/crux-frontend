import { FC, useEffect, useState } from 'react';
import {
  Typography,
  Paper,
  Box,
  Button,
  Container,
  IconButton,
  FilledInput,
  FormControl,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  useTheme,
  Collapse
} from '@mui/material';
import { NextPage } from 'next';
import ChooseYear from '@components/accounting/ChooseYear';
import { trpc } from '@lib/trpc';
import { useWallet } from '@contexts/WalletContext';
import PayReportDialog from '@components/accounting/PayReportDialog';
import { useAlert } from '@lib/contexts/AlertContext';
import ViewReport from '@components/accounting/ViewReport';
import ChooseReport from '@components/accounting/ChooseReport';
import { flexRow } from '@lib/flex';
import ModeEditIcon from "@mui/icons-material/ModeEdit";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const yearsAvailableTRPCQuery = [
  2021, 2022, 2023
]

const Accounting: NextPage = () => {
  const { addAlert } = useAlert()
  const [openAddressesList, setOpenAddressesList] = useState(false)
  const theme = useTheme()
  const [year, setYear] = useState<number>(0)
  const [years, setYears] = useState<number[]>([])
  const [payOpen, setPayOpen] = useState(false)
  useEffect(() => {
    setYears(yearsAvailableTRPCQuery)
  }, [yearsAvailableTRPCQuery]) // replace with TRPC query when its available

  const [selectedReport, setSelectedReport] = useState<TReport | undefined>(undefined)

  const { sessionStatus } = useWallet()

  const checkAvailableReports = trpc.accounting.checkAvailableReportsByYear.useQuery(
    {
      taxYear: year
    },
    {
      enabled: sessionStatus === "authenticated"
    }
  )
  const checkPrepaidReports = trpc.accounting.checkPrepaidReports.useQuery(
    undefined,
    {
      enabled: sessionStatus === "authenticated"
    }
  )

  const handlePayForReport = () => {
    console.log("Handle paying for the report here...");
    setPayOpen(true)
  };

  const payReport = trpc.accounting.processPaymentAndCreateReport.useMutation()
  const createReportDev = async () => {
    await payReport.mutateAsync({ taxYear: year, status: 'AVAILABLE' })
    checkAvailableReports.refetch()
    checkPrepaidReports.refetch()
  }
  const createPrepaidReportDev = async () => {
    await payReport.mutateAsync({ taxYear: year, status: 'PREPAID' })
    checkAvailableReports.refetch()
    checkPrepaidReports.refetch()
  }

  useEffect(() => {
    checkPrepaidReports.refetch()
    checkAvailableReports.refetch()
  }, [payOpen])

  useEffect(() => {
    setSelectedReport(undefined)
  }, [year])

  const editReportCustomName = trpc.accounting.editReportCustomName.useMutation()
  const [openNameEdit, setOpenNameEdit] = useState(false)
  const [newName, setNewName] = useState('')
  const handleOpenNameEdit = () => {
    setNewName(selectedReport?.customName || selectedReport?.id || '')
    setOpenNameEdit(true)
  }
  const handleEditReportName = async (e: any) => {
    e.preventDefault()
    if (selectedReport) {
      const editName = await editReportCustomName.mutateAsync({
        reportId: selectedReport?.id,
        customName: newName
      })
      if (editName) {
        setOpenNameEdit(false)
        setNewName('')
        addAlert('success', `Report renamed to ${newName}`)
        checkAvailableReports.refetch()
        setSelectedReport({ ...selectedReport, customName: newName })
      }
    }
  }
  const handleCancelEdit = () => {
    setNewName(selectedReport?.customName || selectedReport?.id || '')
    setOpenNameEdit(false)
  }

  const handleKeyDown = (event: any) => {
    if (event.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <Container maxWidth="xl">
      <Paper variant="outlined" sx={{ p: 3, mb: 4, maxWidth: '1200px', mx: 'auto' }}>
        <Box sx={{ ...flexRow, mb: 2 }}>
          <Typography variant="h5" sx={{ pr: 2 }}>
            Choose tax year:
          </Typography>
          <ChooseYear
            year={year}
            setYear={setYear}
            years={years}
          />
        </Box>
        {checkAvailableReports.data?.available &&
          <Box sx={{ ...flexRow, mb: 2 }}>
            <Typography variant="h5" sx={{ pr: 2 }}>
              Choose {year} report:
            </Typography>
            <ChooseReport
              selectedReport={selectedReport}
              setSelectedReport={setSelectedReport}
              reports={checkAvailableReports.data.reports}
              handlePayForReport={handlePayForReport}
            />
          </Box>
        }
        {selectedReport &&
          <Box>
            <Box>
              Report name: {openNameEdit ? (
                <FormControl component="form" onSubmit={handleEditReportName} onKeyDown={handleKeyDown}>
                  <FilledInput
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    autoFocus
                    endAdornment={
                      <>
                        <IconButton type="submit">
                          <CheckIcon />
                        </IconButton>
                        <IconButton onClick={handleCancelEdit}>
                          <CloseIcon />
                        </IconButton>
                      </>
                    }
                  />
                </FormControl >
              ) : (
                selectedReport.customName ?? selectedReport.id
              )}
              {!openNameEdit && <IconButton onClick={handleOpenNameEdit}>
                <ModeEditIcon />
              </IconButton>}
            </Box>
            Addresses:
            <Box
              sx={{
                p: '3px 12px',
                fontSize: '1rem',
                minWidth: '64px',
                width: '100%',
                background: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: '6px',
                mb: 1,
                maxWidth: '600px',
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 2,
                '&:hover': {
                  background: 'rgba(130,130,170,0.15)',
                  cursor: 'pointer'
                }
              }}
              onClick={() => setOpenAddressesList(!openAddressesList)}
            >
              <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Show Addresses
              </Box>
              <ExpandMoreIcon sx={{
                transform: openAddressesList
                  ? 'rotate(180deg)'
                  : 'none',
                transition: 'transform 100ms ease-in-out'
              }} />
            </Box>
            <Collapse in={openAddressesList}>
              {selectedReport.addresses.map((address, index) => (
                <Typography key={index}>{address}</Typography>
              ))}
            </Collapse>
          </Box>
        }
      </Paper>

      {sessionStatus !== "authenticated"
        ? <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="h6">Sign in to view your reports.</Typography>
        </Box>
        : year === 0
          ? <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="h6">Please choose a tax year. </Typography>
          </Box>
          : checkAvailableReports.isLoading
            ? <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography variant="h6">Verifying...</Typography>
            </Box>
            : !checkAvailableReports.data?.available
              ? <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography variant="h6">You don&apos;t have a paid report for {year}.</Typography>
                {checkPrepaidReports.data && checkPrepaidReports.data.hasPrepaidReports && <Typography>
                  You have {checkPrepaidReports.data.prepaidReports.length} prepaid report{checkPrepaidReports.data.prepaidReports.length > 1 && 's'} to use.
                </Typography>}
                <Button variant="contained" color="primary" onClick={handlePayForReport} sx={{ mt: 2 }}>
                  Pay for Report
                </Button>
              </Box>
              : selectedReport
                ? <ViewReport report={selectedReport} />
                : <Box sx={{ py: 4, textAlign: 'center' }}>
                  <Typography variant="h6">Please select a report. </Typography>
                </Box>
      }

      <Paper variant="outlined" sx={{ p: 3, mb: 4, maxWidth: '1200px', mx: 'auto', mt: 24 }}>
        <Typography variant="h5">Dev panel</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'row' }}>
          <Button onClick={createPrepaidReportDev}>
            Add a prepaid report
          </Button>
          <Button onClick={createReportDev}>
            Add a paid report for {year}
          </Button>
          <Button>
            Remove all reports for this user
          </Button>
          <Button onClick={() => {
            addAlert('success', 'Alert added')
            console.log('alert')
          }}>Add alert</Button>
        </Box>
      </Paper>
      <PayReportDialog
        open={payOpen}
        setOpen={setPayOpen}
        taxYear={year}
      />
    </Container>
  )
}

export default Accounting
