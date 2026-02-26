import { useEffect, useState } from "react";
import {
  Typography,
  Paper,
  Box,
  Button,
  Container,
  IconButton,
  FilledInput,
  FormControl,
  useTheme,
  Collapse,
} from "@mui/material";
import { NextPage } from "next";
import ChooseYear from "@components/accounting/ChooseYear";
import { trpc } from "@lib/trpc";
import { useWallet } from "@contexts/WalletContext";
import PayReportDialog from "@components/accounting/PayReportDialog";
import { useAlert } from "@lib/contexts/AlertContext";
import ViewReport from "@components/accounting/ViewReport";
import ChooseReport from "@components/accounting/ChooseReport";
import { flexRow } from "@lib/flex";
import ModeEditIcon from "@mui/icons-material/ModeEdit";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import VerifyReportPayment from "@components/accounting/VerifyReportPayment";
import { useRouter } from "next/router";

const yearsAvailableTRPCQuery = [2021, 2022, 2023, 2024, 2025];

const overflowEllipsis = {
  overflow: "hidden",
  whitespace: "nowrap",
  textOverflow: "ellipsis",
  maxWidth: "100%",
};

const Accounting: NextPage = () => {
  const { addAlert } = useAlert();
  const [openAddressesList, setOpenAddressesList] = useState(false);
  const theme = useTheme();
  const [year, setYear] = useState<number>(0);
  const [years, setYears] = useState<number[]>([]);
  const [yearChangedByUser, setYearChangedByUser] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<TReport | undefined>(
    undefined,
  );
  useEffect(() => {
    setYears(yearsAvailableTRPCQuery);
  }, [yearsAvailableTRPCQuery]); // replace with TRPC query when its available
  const { sessionStatus } = useWallet();

  const router = useRouter();
  const reportId = router.query["report-id"];
  const { data: allReports } = trpc.accounting.fetchAllUserReports.useQuery(
    {},
    {
      enabled: sessionStatus === "authenticated",
    },
  );

  useEffect(() => {
    if (
      router.isReady &&
      reportId &&
      typeof reportId === "string" &&
      allReports
    ) {
      // console.log(reportId)
      const report = allReports.reports.find((r) => r.id === reportId);
      if (report && report !== selectedReport && report.taxYear) {
        setSelectedReport(report);
        setYear(report.taxYear);
      }
    }
  }, [reportId, allReports]);

  const checkAvailableReports =
    trpc.accounting.checkAvailableReportsByYear.useQuery(
      {
        taxYear: year,
      },
      {
        enabled: sessionStatus === "authenticated",
      },
    );
  const checkPrepaidReports = trpc.accounting.checkPrepaidReports.useQuery(
    undefined,
    {
      enabled: sessionStatus === "authenticated",
    },
  );

  useEffect(() => {
    if (checkAvailableReports.isSuccess) {
      // If the year changed by user interaction, select the first report automatically.
      // Otherwise, select the report with the same ID as before the refetch, if available.
      if (yearChangedByUser) {
        const firstReportForYear = checkAvailableReports.data.reports[0];
        setSelectedReport(firstReportForYear);
        setYearChangedByUser(false);
        if (firstReportForYear) {
          router.push(
            {
              pathname: router.pathname,
              query: { "report-id": firstReportForYear.id },
            },
            undefined,
            { shallow: true },
          );
        }
      } else {
        const updatedSelectedReport = checkAvailableReports.data.reports.find(
          (report) => report.id === selectedReport?.id,
        );
        setSelectedReport(updatedSelectedReport);
      }
    }
  }, [checkAvailableReports.data?.reports, yearChangedByUser]);

  const handlePayForReport = () => {
    setPayOpen(true);
  };

  useEffect(() => {
    checkPrepaidReports.refetch();
    checkAvailableReports.refetch();
  }, [payOpen]);

  const confirmedPaymentCallback = () => {
    checkAvailableReports.refetch();
  };

  const editReportCustomName = trpc.accounting.editReportCustomName.useMutation(
    {
      onSuccess: () => {
        checkAvailableReports.refetch();
      },
    },
  );
  const [openNameEdit, setOpenNameEdit] = useState(false);
  const [newName, setNewName] = useState("");
  const handleOpenNameEdit = () => {
    setNewName(selectedReport?.customName || selectedReport?.id || "");
    setOpenNameEdit(true);
  };
  const handleEditReportName = async (e: any) => {
    e.preventDefault();
    if (selectedReport && newName) {
      try {
        const editName = await editReportCustomName.mutateAsync({
          reportId: selectedReport.id,
          customName: newName,
        });
        addAlert("success", `Report renamed to ${newName}`);
        setOpenNameEdit(false);
        setNewName("");
        // Update the local state to reflect the new custom name.
        setSelectedReport((prev) =>
          prev?.id === selectedReport.id
            ? { ...prev, customName: newName }
            : prev,
        );
        // Refetch reports to update the list.
        checkAvailableReports.refetch();
      } catch (error) {
        // Handle error (show error message to the user)
        console.error(error);
        addAlert("error", "Failed to rename the report.");
      }
    }
  };
  const handleCancelEdit = () => {
    setNewName(selectedReport?.customName || selectedReport?.id || "");
    setOpenNameEdit(false);
  };

  const handleKeyDown = (event: any) => {
    if (event.key === "Escape") {
      handleCancelEdit();
    }
  };

  return (
    <Container maxWidth="xl">
      <Paper
        variant="outlined"
        sx={{ p: 3, mb: 4, maxWidth: "1200px", mx: "auto" }}
      >
        <Box sx={{ mb: 2 }}>
          <Typography variant="h5" sx={{ mb: 1 }}>
            Choose tax year:
          </Typography>
          <ChooseYear
            year={year}
            setYear={setYear}
            years={years}
            setYearChangedByUser={setYearChangedByUser}
          />
        </Box>
        {checkAvailableReports.data?.reports &&
          checkAvailableReports.data.reports.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" sx={{ mb: 1 }}>
                Choose {year} report:
              </Typography>
              <ChooseReport
                selectedReport={selectedReport}
                setSelectedReport={setSelectedReport}
                setYear={setYear}
                reports={checkAvailableReports.data.reports}
              />
            </Box>
          )}
        {year > 0 && sessionStatus === "authenticated" && (
          <Button
            variant="outlined"
            color="primary"
            onClick={handlePayForReport}
          >
            Generate new {year} report
          </Button>
        )}
      </Paper>

      {selectedReport && (
        <Paper
          variant="outlined"
          sx={{ p: 3, mb: 4, maxWidth: "1200px", mx: "auto" }}
        >
          <Box>
            <Box sx={{ ...flexRow, mb: 3 }}>
              {openNameEdit ? (
                <FormControl
                  component="form"
                  onSubmit={handleEditReportName}
                  onKeyDown={handleKeyDown}
                >
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
                </FormControl>
              ) : (
                <Typography variant="h4">
                  {selectedReport.customName}
                </Typography>
              )}
              {!openNameEdit && (
                <Button
                  startIcon={<ModeEditIcon />}
                  onClick={handleOpenNameEdit}
                >
                  Rename
                </Button>
              )}
            </Box>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Addresses:
            </Typography>
            <Box
              sx={{
                p: "3px 12px",
                fontSize: "1rem",
                minWidth: "64px",
                width: "100%",
                background: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: "6px",
                mb: 1,
                maxWidth: "600px",
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 2,
                "&:hover": {
                  background: "rgba(130,130,170,0.15)",
                  cursor: "pointer",
                },
              }}
              onClick={() => setOpenAddressesList(!openAddressesList)}
            >
              <Box sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                Show Addresses
              </Box>
              <ExpandMoreIcon
                sx={{
                  transform: openAddressesList ? "rotate(180deg)" : "none",
                  transition: "transform 100ms ease-in-out",
                }}
              />
            </Box>
            <Collapse in={openAddressesList}>
              <Box sx={{}}>
                {selectedReport.wallets.map(
                  (wallet: WalletListItem, i: number) => (
                    <Box key={wallet.name} sx={{ mb: 1, pl: 3 }}>
                      <Typography sx={overflowEllipsis}>
                        Wallet: {wallet.name}
                      </Typography>
                      {wallet.addresses.map((address, index) => (
                        <Typography
                          key={`${address}-${index}`}
                          sx={{ ml: 2, ...overflowEllipsis }}
                        >
                          {address}
                        </Typography>
                      ))}
                    </Box>
                  ),
                )}
              </Box>
            </Collapse>
          </Box>
        </Paper>
      )}

      {sessionStatus !== "authenticated" ? (
        <Box sx={{ py: 4, textAlign: "center" }}>
          <Typography variant="h6">Sign in to view your reports.</Typography>
        </Box>
      ) : year === 0 ? (
        <Box sx={{ py: 4, textAlign: "center" }}>
          <Typography variant="h6">Please choose a tax year. </Typography>
        </Box>
      ) : checkAvailableReports.isLoading ? (
        <Box sx={{ py: 4, textAlign: "center" }}>
          <Typography variant="h6">Verifying...</Typography>
        </Box>
      ) : !checkAvailableReports.data?.available &&
        !checkAvailableReports.data?.paymentPending ? (
        <Box sx={{ py: 4, textAlign: "center" }}>
          <Typography variant="h6">
            You don&apos;t have any report for {year}.
          </Typography>
          {checkPrepaidReports.data &&
            checkPrepaidReports.data.hasPrepaidReports && (
              <Typography>
                You have {checkPrepaidReports.data.prepaidReports.length}{" "}
                prepaid report
                {checkPrepaidReports.data.prepaidReports.length > 1 && "s"} to
                use.
              </Typography>
            )}
          <Button
            variant="contained"
            color="primary"
            onClick={handlePayForReport}
            sx={{ mt: 2 }}
          >
            Generate Report for {year}
          </Button>
        </Box>
      ) : selectedReport ? (
        checkAvailableReports.data.reports.find(
          (report) => selectedReport.id === report.id,
        )?.status === "AVAILABLE" ? (
          <ViewReport report={selectedReport} />
        ) : (
          <VerifyReportPayment
            report={selectedReport}
            confirmedPaymentCallback={confirmedPaymentCallback}
          />
        )
      ) : (
        <Box sx={{ py: 4, textAlign: "center" }}>
          <Typography variant="h6">Please select a report. </Typography>
        </Box>
      )}
      {payOpen && (
        <PayReportDialog
          open={payOpen}
          setOpen={setPayOpen}
          taxYear={year}
          setSelectedReport={setSelectedReport}
        />
      )}
    </Container>
  );
};

export default Accounting;
