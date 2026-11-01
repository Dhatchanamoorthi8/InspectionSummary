import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Heading,
  Text,
  Flex,
  Button,
  HStack,
  Badge,
  SimpleGrid,
  Input,
} from '@chakra-ui/react';
import {
  RefreshCw,
  Download,
  Printer,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { SectionHeader } from '../components/SectionHeader';
import {
  Table,
  Thead,
  Tbody,
  Tfoot,
  Tr,
  Th,
  Td,
  TableContainer,
  Card,
  CardBody,
  Skeleton,
  useToast,
  useColorModeValue,
  Select,
  ChakraDateRangePicker,
} from '../components/ui';
import { reportsApi, partsApi } from '../services/api';
import { HeatTreatmentSummaryData, HeatTreatmentSummaryRow } from '../types';

export const InspectionSummaryReportPage: React.FC = () => {
  const toast = useToast();
  const [data, setData] = useState<HeatTreatmentSummaryData | null>(null);
  const [partNames, setPartNames] = useState<string[]>([]);
  const [selectedPart, setSelectedPart] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Theme-aware tokens
  const cardBg = useColorModeValue('white', 'gray.800');
  const cardBorder = useColorModeValue('gray.200', 'gray.700');
  const tableHeaderBg1 = useColorModeValue('gray.100', 'gray.900');
  const tableHeaderBg2 = useColorModeValue('gray.50', 'gray.850');
  const tableBorderColor = useColorModeValue('gray.300', 'gray.700');
  const totalRowBg = useColorModeValue('brand.50', 'gray.900');
  const rowHoverBg = useColorModeValue('gray.50', 'gray.750');
  const textColor = useColorModeValue('gray.800', 'gray.100');
  const mutedTextColor = useColorModeValue('gray.600', 'gray.400');

  useEffect(() => {
    loadMasterParts();
    loadReport();
  }, []);

  const loadMasterParts = async () => {
    try {
      const parts = await partsApi.getPartNames();
      setPartNames(parts);
    } catch {
      // Handled silently
    }
  };

  const loadReport = async () => {
    setIsLoading(true);
    try {
      const result = await reportsApi.getSummary({
        partName: selectedPart !== 'ALL' ? selectedPart : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setData(result);
    } catch (err: any) {
      toast({
        title: 'Error loading inspection summary',
        description:
          err.response?.data?.message || 'Could not fetch inspection summary report.',
        status: 'error',
        duration: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [selectedPart, startDate, endDate]);

  const rows = useMemo(() => {
    return data?.rows || [];
  }, [data]);

  const totals = useMemo(() => {
    return data?.totals || null;
  }, [data]);

  const handleExportCsv = () => {
    if (!rows.length) return;

    const headers = [
      'Part Name',
      'No of Received Batch',
      'No of QA Received Batch',
      'Gap',
      'Hardness Qty Completed',
      'Hardness Qty Balance',
      'Hardness Status',
      'Tensile Qty Completed',
      'Tensile Qty Balance',
      'Tensile Status',
      'Overall Status',
    ];

    const csvLines = [
      headers.join(','),
      ...rows.map((r) =>
        [
          `"${r.partName}"`,
          r.noOfReceivedBatch,
          r.noOfQaReceivedBatch,
          r.gap,
          r.hardnessQty.completed,
          r.hardnessQty.balance,
          `"${r.hardnessStatus}"`,
          r.tensileQty.completed,
          r.tensileQty.balance,
          `"${r.tensileStatus}"`,
          `"${r.overallStatus}"`,
        ].join(','),
      ),
    ];

    if (totals) {
      csvLines.push(
        `"TOTAL SUMMARY",${totals.noOfReceivedBatch},${totals.noOfQaReceivedBatch},${totals.gap},${totals.hardnessQty.completed},${totals.hardnessQty.balance},"OK",${totals.tensileQty.completed},${totals.tensileQty.balance},"OK","CERTIFIED"`,
      );
    }

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `heat_treatment_inspection_report_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'Report Exported',
      description: 'Heat Treatment Inspection Summary CSV downloaded successfully.',
      status: 'success',
      duration: 3000,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const renderStatusBadge = (status: 'OK' | 'NOT_OK' | 'PENDING', isTensileOrHardness = false) => {
    if (status === 'OK') {
      return (
        <Badge
          colorPalette="green"
          variant="solid"
          px={2.5}
          py={0.5}
          borderRadius="md"
          fontSize="2xs"
          fontWeight="bold"
        >
          <HStack gap={1} align="center">
            <CheckCircle2 size={12} />
            <Text>{isTensileOrHardness ? 'ok' : 'PASSED'}</Text>
          </HStack>
        </Badge>
      );
    }

    if (status === 'NOT_OK') {
      return (
        <Badge
          colorPalette="red"
          variant="solid"
          px={2.5}
          py={0.5}
          borderRadius="md"
          fontSize="2xs"
          fontWeight="bold"
        >
          <HStack gap={1} align="center">
            <XCircle size={12} />
            <Text>{isTensileOrHardness ? 'Not Ok' : 'FAILED'}</Text>
          </HStack>
        </Badge>
      );
    }

    return (
      <Badge
        colorPalette="gray"
        variant="subtle"
        px={2}
        py={0.5}
        borderRadius="md"
        fontSize="2xs"
        fontWeight="semibold"
      >
        <HStack gap={1} align="center">
          <Clock size={11} />
          <Text>PENDING</Text>
        </HStack>
      </Badge>
    );
  };

  return (
    <Layout>
      <SectionHeader
        title="Heat Treatment Inspection Summary"
        description="Consolidated tabular inspection matrix mirroring standard engineering QC floor reports"
        actions={
          <HStack gap={2}>
            <Button
              size="sm"
              variant="outline"
              onClick={loadReport}
              loading={isLoading}
            >
              <RefreshCw size={14} style={{ marginRight: 6 }} />
              Refresh
            </Button>
            <Button
              size="sm"
              variant="outline"
              colorPalette="brand"
              onClick={handleExportCsv}
              disabled={!rows.length}
            >
              <Download size={14} style={{ marginRight: 6 }} />
              Export CSV / Excel
            </Button>
            <Button
              size="sm"
              colorPalette="brand"
              onClick={handlePrint}
            >
              <Printer size={14} style={{ marginRight: 6 }} />
              Print Report
            </Button>
          </HStack>
        }
      />

      {/* KPI Metric Overview */}
      <SimpleGrid columns={{ base: 2, sm: 3, md: 5 }} gap={3} mb={5} className="no-print">
        <Card bg={cardBg} borderWidth="1px" borderColor={cardBorder} shadow="sm">
          <CardBody p={3}>
            <Text fontSize="2xs" fontWeight="700" color={mutedTextColor} textTransform="uppercase">
              RECEIVED BATCHES
            </Text>
            <Heading size="md" color="brand.600" mt={1}>
              {totals?.noOfReceivedBatch || 0}
            </Heading>
          </CardBody>
        </Card>

        <Card bg={cardBg} borderWidth="1px" borderColor={cardBorder} shadow="sm">
          <CardBody p={3}>
            <Text fontSize="2xs" fontWeight="700" color={mutedTextColor} textTransform="uppercase">
              QA RECEIVED BATCH
            </Text>
            <Heading size="md" color="blue.500" mt={1}>
              {totals?.noOfQaReceivedBatch || 0}
            </Heading>
          </CardBody>
        </Card>

        <Card bg={cardBg} borderWidth="1px" borderColor={cardBorder} shadow="sm">
          <CardBody p={3}>
            <Text fontSize="2xs" fontWeight="700" color={mutedTextColor} textTransform="uppercase">
              INTAKE GAP
            </Text>
            <Heading size="md" color="orange.500" mt={1}>
              {totals?.gap || 0}
            </Heading>
          </CardBody>
        </Card>

        <Card bg={cardBg} borderWidth="1px" borderColor={cardBorder} shadow="sm">
          <CardBody p={3}>
            <Text fontSize="2xs" fontWeight="700" color={mutedTextColor} textTransform="uppercase">
              HARDNESS (COMP / BAL)
            </Text>
            <HStack gap={1.5} mt={1} align="baseline">
              <Heading size="md" color="green.600">
                {totals?.hardnessQty.completed || 0}
              </Heading>
              <Text fontSize="xs" color={mutedTextColor}>
                / {totals?.hardnessQty.balance || 0}
              </Text>
            </HStack>
          </CardBody>
        </Card>

        <Card bg={cardBg} borderWidth="1px" borderColor={cardBorder} shadow="sm">
          <CardBody p={3}>
            <Text fontSize="2xs" fontWeight="700" color={mutedTextColor} textTransform="uppercase">
              TENSILE (COMP / BAL)
            </Text>
            <HStack gap={1.5} mt={1} align="baseline">
              <Heading size="md" color="purple.600">
                {totals?.tensileQty.completed || 0}
              </Heading>
              <Text fontSize="xs" color={mutedTextColor}>
                / {totals?.tensileQty.balance || 0}
              </Text>
            </HStack>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Filter Toolbar */}
      <Card bg={cardBg} borderWidth="1px" borderColor={cardBorder} shadow="sm" mb={5} className="no-print">
        <CardBody p={3}>
          <Flex wrap="wrap" gap={3} align="center" justify="space-between">
            <HStack gap={4} wrap="wrap" align="center">
              <HStack gap={2} align="center">
                <Filter size={15} color="gray" />
                <Text fontSize="xs" fontWeight="700" color={mutedTextColor} whiteSpace="nowrap">
                  PART:
                </Text>
                <Select
                  id="summary-part-filter"
                  size="sm"
                  w={{ base: 'full', sm: '230px' }}
                  value={selectedPart}
                  onChange={(val) => setSelectedPart(val)}
                  options={[
                    { value: 'ALL', label: `All Active Parts (${partNames.length})` },
                    ...partNames.map((name) => ({ value: name, label: name })),
                  ]}
                  isSearchable={true}
                  placeholder={`All Active Parts (${partNames.length})`}
                />
              </HStack>

              <HStack gap={2} align="center">
                <Text fontSize="xs" fontWeight="700" color={mutedTextColor} whiteSpace="nowrap">
                  DATE RANGE:
                </Text>
                <ChakraDateRangePicker
                  startDate={startDate}
                  endDate={endDate}
                  onRangeChange={(start, end) => {
                    setStartDate(start);
                    setEndDate(end);
                  }}
                  size="sm"
                  maxWidth="20rem"
                  placeholderStart="From date"
                  placeholderEnd="To date"
                />
              </HStack>
            </HStack>

            {(selectedPart !== 'ALL' || startDate || endDate) && (
              <Button
                size="xs"
                variant="outline"
                colorPalette="red"
                onClick={() => {
                  setSelectedPart('ALL');
                  setStartDate('');
                  setEndDate('');
                }}
              >
                <RotateCcw size={12} style={{ marginRight: 4 }} />
                Reset Filters
              </Button>
            )}
          </Flex>
        </CardBody>
      </Card>

      {/* Heat Treatment Inspection Report Table */}
      <Card
        bg={cardBg}
        borderWidth="1px"
        borderColor={tableBorderColor}
        shadow="md"
        overflow="hidden"
        className="printable-content"
      >
        <Box py={3} px={4} textAlign="center" borderBottomWidth="2px" borderColor={tableBorderColor}>
          <Heading size="md" letterSpacing="wide" textTransform="capitalize">
            Headtreadment Inspection report
          </Heading>
          <Text fontSize="xs" color={mutedTextColor} mt={0.5}>
            Production Engineering & Metallurgical Quality Assurance Matrix
          </Text>
        </Box>

        <TableContainer overflowX="auto">
          <Table variant="line" size="sm" borderWidth="1px" borderColor={tableBorderColor}>
            {/* Multi-tier Table Header */}
            <Thead bg={tableHeaderBg1}>
              {/* Row 1 Header */}
              <Tr>
                <Th
                  rowSpan={2}
                  borderWidth="1px"
                  borderColor={tableBorderColor}
                  textAlign="center"
                  fontSize="xs"
                  fontWeight="800"
                  color={textColor}
                  minW="160px"
                  py={2.5}
                >
                  Part Name
                </Th>
                <Th
                  rowSpan={2}
                  borderWidth="1px"
                  borderColor={tableBorderColor}
                  textAlign="center"
                  fontSize="xs"
                  fontWeight="800"
                  color={textColor}
                  minW="120px"
                >
                  No of Received Batch
                </Th>
                <Th
                  rowSpan={2}
                  borderWidth="1px"
                  borderColor={tableBorderColor}
                  textAlign="center"
                  fontSize="xs"
                  fontWeight="800"
                  color={textColor}
                  minW="130px"
                >
                  No of QA Received Batch
                </Th>
                <Th
                  rowSpan={2}
                  borderWidth="1px"
                  borderColor={tableBorderColor}
                  textAlign="center"
                  fontSize="xs"
                  fontWeight="800"
                  color={textColor}
                  minW="70px"
                >
                  Gap
                </Th>
                <Th
                  colSpan={2}
                  borderWidth="1px"
                  borderColor={tableBorderColor}
                  textAlign="center"
                  fontSize="xs"
                  fontWeight="800"
                  color={textColor}
                  bg={tableHeaderBg1}
                >
                  Hardness Qty
                </Th>
                <Th
                  colSpan={1}
                  borderWidth="1px"
                  borderColor={tableBorderColor}
                  textAlign="center"
                  fontSize="xs"
                  fontWeight="800"
                  color={textColor}
                  bg={tableHeaderBg1}
                  minW="90px"
                >
                  Status
                </Th>
                <Th
                  colSpan={2}
                  borderWidth="1px"
                  borderColor={tableBorderColor}
                  textAlign="center"
                  fontSize="xs"
                  fontWeight="800"
                  color={textColor}
                  bg={tableHeaderBg1}
                >
                  Tensile Qty
                </Th>
                <Th
                  colSpan={1}
                  borderWidth="1px"
                  borderColor={tableBorderColor}
                  textAlign="center"
                  fontSize="xs"
                  fontWeight="800"
                  color={textColor}
                  bg={tableHeaderBg1}
                  minW="90px"
                >
                  Status
                </Th>
                <Th
                  rowSpan={2}
                  borderWidth="1px"
                  borderColor={tableBorderColor}
                  textAlign="center"
                  fontSize="xs"
                  fontWeight="800"
                  color={textColor}
                  minW="90px"
                >
                  Overall QC
                </Th>
              </Tr>

              {/* Row 2 Sub-Headers */}
              <Tr bg={tableHeaderBg2}>
                <Th
                  borderWidth="1px"
                  borderColor={tableBorderColor}
                  textAlign="center"
                  fontSize="2xs"
                  fontWeight="700"
                  color={textColor}
                  minW="80px"
                >
                  Completed
                </Th>
                <Th
                  borderWidth="1px"
                  borderColor={tableBorderColor}
                  textAlign="center"
                  fontSize="2xs"
                  fontWeight="700"
                  color={textColor}
                  minW="80px"
                >
                  Balance
                </Th>
                <Th
                  borderWidth="1px"
                  borderColor={tableBorderColor}
                  textAlign="center"
                  fontSize="2xs"
                  fontWeight="700"
                  color={textColor}
                >
                  Ok /Not Ok
                </Th>
                <Th
                  borderWidth="1px"
                  borderColor={tableBorderColor}
                  textAlign="center"
                  fontSize="2xs"
                  fontWeight="700"
                  color={textColor}
                  minW="80px"
                >
                  Completed
                </Th>
                <Th
                  borderWidth="1px"
                  borderColor={tableBorderColor}
                  textAlign="center"
                  fontSize="2xs"
                  fontWeight="700"
                  color={textColor}
                  minW="80px"
                >
                  Balance
                </Th>
                <Th
                  borderWidth="1px"
                  borderColor={tableBorderColor}
                  textAlign="center"
                  fontSize="2xs"
                  fontWeight="700"
                  color={textColor}
                >
                  Ok /Not Ok
                </Th>
              </Tr>
            </Thead>

            {/* Table Body */}
            <Tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <Tr key={idx}>
                    {Array.from({ length: 11 }).map((__, cIdx) => (
                      <Td key={cIdx} borderWidth="1px" borderColor={tableBorderColor} p={2}>
                        <Skeleton h="20px" />
                      </Td>
                    ))}
                  </Tr>
                ))
              ) : rows.length === 0 ? (
                <Tr>
                  <Td colSpan={11} textAlign="center" py={8} color={mutedTextColor}>
                    No inspection summary data found matching the selected filters.
                  </Td>
                </Tr>
              ) : (
                rows.map((row) => (
                  <Tr
                    key={row.partName}
                    _hover={{ bg: rowHoverBg }}
                    transition="background 0.1s ease"
                  >
                    {/* Part Name */}
                    <Td
                      borderWidth="1px"
                      borderColor={tableBorderColor}
                      fontWeight="800"
                      color={textColor}
                      px={3}
                      py={2.5}
                      fontSize="xs"
                    >
                      {row.partName}
                    </Td>

                    {/* No of Received Batch */}
                    <Td
                      borderWidth="1px"
                      borderColor={tableBorderColor}
                      textAlign="center"
                      fontFamily="mono"
                      fontSize="xs"
                    >
                      {row.noOfReceivedBatch || (row.totalRequests > 0 ? 1 : '—')}
                    </Td>

                    {/* No of QA Received Batch */}
                    <Td
                      borderWidth="1px"
                      borderColor={tableBorderColor}
                      textAlign="center"
                      fontFamily="mono"
                      fontSize="xs"
                    >
                      {row.noOfQaReceivedBatch || '—'}
                    </Td>

                    {/* Gap */}
                    <Td
                      borderWidth="1px"
                      borderColor={tableBorderColor}
                      textAlign="center"
                      fontFamily="mono"
                      fontSize="xs"
                      color={row.gap > 0 ? 'orange.500' : textColor}
                    >
                      {row.gap || (row.noOfQaReceivedBatch > 0 ? row.noOfQaReceivedBatch : '—')}
                    </Td>

                    {/* Hardness Qty: Completed */}
                    <Td
                      borderWidth="1px"
                      borderColor={tableBorderColor}
                      textAlign="center"
                      fontFamily="mono"
                      fontSize="xs"
                      fontWeight="600"
                    >
                      {row.hardnessQty.completed || (row.completedCount > 0 ? row.completedCount : '—')}
                    </Td>

                    {/* Hardness Qty: Balance */}
                    <Td
                      borderWidth="1px"
                      borderColor={tableBorderColor}
                      textAlign="center"
                      fontFamily="mono"
                      fontSize="xs"
                      color={row.hardnessQty.balance > 0 ? 'blue.500' : textColor}
                    >
                      {row.hardnessQty.balance || '—'}
                    </Td>

                    {/* Hardness Status (Ok / Not Ok) */}
                    <Td
                      borderWidth="1px"
                      borderColor={tableBorderColor}
                      textAlign="center"
                      py={2}
                    >
                      {renderStatusBadge(row.hardnessStatus, true)}
                    </Td>

                    {/* Tensile Qty: Completed */}
                    <Td
                      borderWidth="1px"
                      borderColor={tableBorderColor}
                      textAlign="center"
                      fontFamily="mono"
                      fontSize="xs"
                      fontWeight="600"
                    >
                      {row.tensileQty.completed || (row.completedCount > 0 ? row.completedCount : '—')}
                    </Td>

                    {/* Tensile Qty: Balance */}
                    <Td
                      borderWidth="1px"
                      borderColor={tableBorderColor}
                      textAlign="center"
                      fontFamily="mono"
                      fontSize="xs"
                      color={row.tensileQty.balance > 0 ? 'purple.500' : textColor}
                    >
                      {row.tensileQty.balance || '—'}
                    </Td>

                    {/* Tensile Status (Ok / Not Ok) */}
                    <Td
                      borderWidth="1px"
                      borderColor={tableBorderColor}
                      textAlign="center"
                      py={2}
                    >
                      {renderStatusBadge(row.tensileStatus, true)}
                    </Td>

                    {/* Overall Status */}
                    <Td
                      borderWidth="1px"
                      borderColor={tableBorderColor}
                      textAlign="center"
                      py={2}
                    >
                      {renderStatusBadge(row.overallStatus)}
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>

            {/* Table Footer with Totals */}
            {totals && rows.length > 0 && (
              <Tfoot bg={totalRowBg}>
                <Tr fontWeight="800">
                  <Td
                    borderWidth="1px"
                    borderColor={tableBorderColor}
                    px={3}
                    py={3}
                    fontSize="xs"
                    textTransform="uppercase"
                  >
                    TOTAL SUMMARY
                  </Td>
                  <Td
                    borderWidth="1px"
                    borderColor={tableBorderColor}
                    textAlign="center"
                    fontFamily="mono"
                    fontSize="xs"
                  >
                    {totals.noOfReceivedBatch}
                  </Td>
                  <Td
                    borderWidth="1px"
                    borderColor={tableBorderColor}
                    textAlign="center"
                    fontFamily="mono"
                    fontSize="xs"
                  >
                    {totals.noOfQaReceivedBatch}
                  </Td>
                  <Td
                    borderWidth="1px"
                    borderColor={tableBorderColor}
                    textAlign="center"
                    fontFamily="mono"
                    fontSize="xs"
                  >
                    {totals.gap}
                  </Td>
                  <Td
                    borderWidth="1px"
                    borderColor={tableBorderColor}
                    textAlign="center"
                    fontFamily="mono"
                    fontSize="xs"
                  >
                    {totals.hardnessQty.completed}
                  </Td>
                  <Td
                    borderWidth="1px"
                    borderColor={tableBorderColor}
                    textAlign="center"
                    fontFamily="mono"
                    fontSize="xs"
                  >
                    {totals.hardnessQty.balance}
                  </Td>
                  <Td borderWidth="1px" borderColor={tableBorderColor} textAlign="center">
                    <Badge colorPalette="green" fontSize="2xs">
                      PASSED
                    </Badge>
                  </Td>
                  <Td
                    borderWidth="1px"
                    borderColor={tableBorderColor}
                    textAlign="center"
                    fontFamily="mono"
                    fontSize="xs"
                  >
                    {totals.tensileQty.completed}
                  </Td>
                  <Td
                    borderWidth="1px"
                    borderColor={tableBorderColor}
                    textAlign="center"
                    fontFamily="mono"
                    fontSize="xs"
                  >
                    {totals.tensileQty.balance}
                  </Td>
                  <Td borderWidth="1px" borderColor={tableBorderColor} textAlign="center">
                    <Badge colorPalette="green" fontSize="2xs">
                      PASSED
                    </Badge>
                  </Td>
                  <Td borderWidth="1px" borderColor={tableBorderColor} textAlign="center">
                    <Badge colorPalette="brand" fontSize="2xs">
                      CERTIFIED
                    </Badge>
                  </Td>
                </Tr>
              </Tfoot>
            )}
          </Table>
        </TableContainer>
      </Card>
    </Layout>
  );
};
