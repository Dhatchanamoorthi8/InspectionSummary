import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Flex,
  HStack,
  VStack,
  SimpleGrid,
  Input,
  Textarea,
  Badge,
  Icon,
  Image,
} from '@chakra-ui/react';
import {
  Button,
  useToast,
  Divider,
  Checkbox,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Card,
  CardBody,
  useColorModeValue,
  DatePicker,
  ConfirmationDialog,
} from '../components/ui';
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Download,
  Printer,
  Edit3,
  History,
  FileCheck,
  Send,
  Flame,
  Trash2,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { StatusBadge } from '../components/StatusBadge';
import { SignaturePad } from '../components/SignaturePad';
import { FormField } from '../components/FormField';
import { requestsApi, reportsApi } from '../services/api';
import { InspectionRequest, InspectionReport, QCStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { LineInspectionForm } from '../modules/inspection/LineInspectionForm';
import { evaluateLineInspection, LineInspectionData } from '../modules/inspection';

export const ReportEntryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>(); // requestId
  const { user, updateSignature } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [request, setRequest] = useState<InspectionRequest | null>(null);
  const [report, setReport] = useState<InspectionReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form inputs for new submission
  const todayStr = new Date().toISOString().slice(0, 10);
  const [reportDate, setReportDate] = useState(todayStr);
  const [heatBatchNumber, setHeatBatchNumber] = useState('');
  const [furnace, setFurnace] = useState('');
  const [autoReport, setAutoReport] = useState('');
  const [sampleBatchDate, setSampleBatchDate] = useState(todayStr);

  const [bhn, setBhn] = useState<string>('');
  const [ys, setYs] = useState<string>('');
  const [uts, setUts] = useState<string>('');
  const [elongation, setElongation] = useState<string>('');
  const [inspectorRemarks, setInspectorRemarks] = useState('');
  const [confirmedSignature, setConfirmedSignature] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // Line Inspection module state
  const isLineModule = request?.moduleType === 'LINE_INSPECTION';
  const [lineData, setLineData] = useState<Partial<LineInspectionData>>({
    lineId: 'Line-01',
    shift: 'Shift-A',
    visualCheck: 'PASS',
    torqueNm: 45.0,
    dimensionDeviationMm: 0.015,
    defectCount: 0,
    supervisor: '',
  });

  const lineEvaluation = evaluateLineInspection(lineData);

  const handleLineDataChange = (field: keyof LineInspectionData, value: any) => {
    setLineData((prev) => ({ ...prev, [field]: value }));
  };

  // Void / Delete report state
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);

  // Inline signature creation if user lacks one
  const [showInlineSigPad, setShowInlineSigPad] = useState(false);

  // Revision Modal State
  const [isRevisionOpen, setIsRevisionOpen] = useState(false);
  const [revisionReason, setRevisionReason] = useState('');
  const [revBhn, setRevBhn] = useState('');
  const [revYs, setRevYs] = useState('');
  const [revUts, setRevUts] = useState('');
  const [revElongation, setRevElongation] = useState('');
  const [revRemarks, setRevRemarks] = useState('');
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false);

  const isPE = user?.role === 'PRODUCTION_ENGINEER';

  const cardBg = useColorModeValue('white', 'gray.800');
  const cardBorder = useColorModeValue('industrial.200', 'gray.700');
  const panelBg = useColorModeValue('industrial.50', 'gray.900');
  const subPanelBg = useColorModeValue('gray.50', 'gray.700');
  const headingColor = useColorModeValue('industrial.900', 'white');
  const subHeadingColor = useColorModeValue('industrial.800', 'gray.200');
  const textColor = useColorModeValue('gray.600', 'gray.300');
  const sigBoxBg = useColorModeValue('white', 'gray.900');
  const sigBoxBorder = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    if (id) {
      loadData(id);
    }
  }, [id]);

  const loadData = async (reqId: string) => {
    setIsLoading(true);
    try {
      const req = await requestsApi.getRequestById(reqId);
      setRequest(req);

      // Check if report already exists
      if (req.report) {
        setReport(req.report);
      } else {
        try {
          const rep = await reportsApi.getReportById(reqId);
          setReport(rep);
        } catch (e) {
          // Report not yet created, which is normal for in-progress tasks
        }
      }
    } catch (err: any) {
      toast({
        title: 'Error loading inspection data',
        description: err.response?.data?.message || err.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      navigate(isPE ? '/requests' : '/tasks');
    } finally {
      setIsLoading(false);
    }
  };

  // Live metallurgical calculation preview
  const numBhn = parseFloat(bhn);
  const numYs = parseFloat(ys);
  const numUts = parseFloat(uts);
  const numE = parseFloat(elongation);

  const hasBhn = !isNaN(numBhn) && bhn.trim() !== '';
  const hasMechanical =
    !isNaN(numYs) &&
    !isNaN(numUts) &&
    !isNaN(numE) &&
    ys.trim() !== '' &&
    uts.trim() !== '' &&
    elongation.trim() !== '';

  const hardnessStatus: QCStatus = hasBhn ? (numBhn >= 80.0 ? 'OK' : 'NOT_OK') : 'NOT_OK';
  const mechanicalStatus: QCStatus = hasMechanical
    ? numYs >= 220.0 && numUts >= 280.0 && numE >= 1.0
      ? 'OK'
      : 'NOT_OK'
    : 'NOT_OK';

  const isOverallOk = hasBhn && hasMechanical && hardnessStatus === 'OK' && mechanicalStatus === 'OK';
  const overallStatus: QCStatus = hasBhn || hasMechanical ? (isOverallOk ? 'OK' : 'NOT_OK') : 'NOT_OK';
  const isRemarksMandatory = (hasBhn || hasMechanical) && overallStatus === 'NOT_OK';

  // Live revision metallurgical calculation preview
  const revNumBhn = parseFloat(revBhn);
  const revNumYs = parseFloat(revYs);
  const revNumUts = parseFloat(revUts);
  const revNumE = parseFloat(revElongation);

  const revHardnessStatus: QCStatus = !isNaN(revNumBhn)
    ? revNumBhn >= 80.0
      ? 'OK'
      : 'NOT_OK'
    : 'NOT_OK';
  const revMechanicalStatus: QCStatus =
    !isNaN(revNumYs) && !isNaN(revNumUts) && !isNaN(revNumE)
      ? revNumYs >= 220.0 && revNumUts >= 280.0 && revNumE >= 1.0
        ? 'OK'
        : 'NOT_OK'
      : 'NOT_OK';
  const revOverallStatus: QCStatus =
    revHardnessStatus === 'OK' && revMechanicalStatus === 'OK' ? 'OK' : 'NOT_OK';
  const isRevRemarksMandatory = revOverallStatus === 'NOT_OK';

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);
    if (!request) return;

    if (isPE) {
      toast({
        title: 'Unauthorized Action',
        description: 'Production Engineers are not permitted to submit inspection reports.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    if (isLineModule) {
      if (!lineData.lineId || !lineData.shift) {
        toast({
          title: 'Missing Required Fields',
          description: 'Production line number and shift are required.',
          status: 'warning',
          duration: 3000,
        });
        return;
      }
      if (lineEvaluation.overallStatus === 'NOT_OK' && !inspectorRemarks.trim()) {
        toast({
          title: 'Inspector Remarks Mandatory',
          description: 'When line quality inspection result is NOT OK, detailed non-conformance remarks are mandatory.',
          status: 'error',
          duration: 4000,
        });
        return;
      }
      setIsSubmitting(true);
      try {
        const payload = {
          requestId: request.id,
          moduleType: 'LINE_INSPECTION',
          lineId: lineData.lineId,
          shift: lineData.shift,
          supervisor: lineData.supervisor,
          visualCheck: lineData.visualCheck,
          torqueNm: lineData.torqueNm,
          dimensionDeviationMm: lineData.dimensionDeviationMm,
          defectCount: lineData.defectCount,
          inspectorRemarks: inspectorRemarks.trim(),
        };
        const submitted = await reportsApi.submitReport(payload);
        toast({
          title: 'Line Inspection Report submitted',
          description: `Line inspection report for ${submitted.requestNumber} recorded successfully.`,
          status: 'success',
          duration: 3000,
        });
        setReport(submitted);
        loadData(request.id);
      } catch (err: any) {
        toast({
          title: 'Submission failed',
          description: err.response?.data?.message || err.message,
          status: 'error',
          duration: 4000,
        });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!heatBatchNumber.trim() || !furnace.trim() || !autoReport.trim() || !reportDate || !sampleBatchDate) {
      toast({
        title: 'Required Metadata Missing',
        description: 'Please complete all required report and batch metadata fields.',
        status: 'warning',
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    if (!hasBhn || !hasMechanical) {
      toast({
        title: 'Laboratory Measurements Missing',
        description: 'Please enter all hardness and mechanical property test measurements.',
        status: 'warning',
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    if (numBhn < 0 || numBhn > 3000 || numYs < 0 || numYs > 5000 || numUts < 0 || numUts > 5000 || numE < 0 || numE > 100) {
      toast({
        title: 'Invalid Measurement Values',
        description: 'Test measurements must be non-negative and within valid physical ranges.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    if (!user?.signatureData) {
      toast({
        title: 'Digital signature required',
        description: 'Please draw and save your digital signature before report submission.',
        status: 'warning',
        duration: 4000,
        isClosable: true,
      });
      setShowInlineSigPad(true);
      return;
    }

    if (!confirmedSignature) {
      toast({
        title: 'Signature confirmation required',
        description: 'Please check the box confirming your signature for this certified report.',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    if (isRemarksMandatory && !inspectorRemarks.trim()) {
      toast({
        title: 'Mandatory Inspector Remarks Missing',
        description:
          'Quality control policy strictly requires remarks when Hardness or Mechanical status is NOT OK.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        requestId: request.id,
        reportDate,
        heatBatchNumber: heatBatchNumber.trim(),
        furnace: furnace.trim(),
        autoReport: autoReport.trim(),
        sampleBatchDate,
        bhn: numBhn,
        ys: numYs,
        uts: numUts,
        elongation: numE,
        inspectorRemarks: inspectorRemarks.trim(),
      };

      const submitted = await reportsApi.submitReport(payload);
      toast({
        title: 'Report submitted successfully',
        description: `Inspection Report ${submitted.requestNumber} is now official and completed.`,
        status: 'success',
        duration: 4000,
        isClosable: true,
      });
      setReport(submitted);
      loadData(request.id);
    } catch (err: any) {
      toast({
        title: 'Submission rejected',
        description: err.response?.data?.message || err.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoidReport = async () => {
    if (!report) return;
    setIsVoiding(true);
    try {
      await reportsApi.deleteReport(report.id, voidReason || 'Report voided and deleted by authorized staff');
      toast({
        title: 'Report voided and deleted',
        description: 'Inspection report voided. Request status reverted to In Progress for re-inspection.',
        status: 'info',
        duration: 4000,
        isClosable: true,
      });
      setIsVoidModalOpen(false);
      setReport(null);
      if (id) loadData(id);
    } catch (err: any) {
      toast({
        title: 'Void failed',
        description: err.response?.data?.message || err.message,
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setIsVoiding(false);
    }
  };

  const handleOpenRevisionModal = () => {
    if (!report) return;
    setRevBhn(String(report.bhn));
    setRevYs(String(report.ys));
    setRevUts(String(report.uts));
    setRevElongation(String(report.elongation));
    setRevRemarks(report.inspectorRemarks || '');
    setRevisionReason('');
    setIsRevisionOpen(true);
  };

  const handleSubmitRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!report) return;

    if (!revisionReason.trim()) {
      toast({
        title: 'Revision reason required',
        description: 'You must provide a clear audit reason for revising this report.',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    if (isRevRemarksMandatory && !revRemarks.trim()) {
      toast({
        title: 'Remarks required for Not OK',
        description: 'Inspector remarks are required when overall status is Not OK.',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setIsSubmittingRevision(true);
    try {
      const updated = await reportsApi.createRevision(report.id, {
        reason: revisionReason.trim(),
        bhn: revNumBhn,
        ys: revNumYs,
        uts: revNumUts,
        elongation: revNumE,
        inspectorRemarks: revRemarks.trim(),
      });
      toast({
        title: 'Revision recorded',
        description: `Revision #${(updated.revisions?.length || 1)} saved to permanent audit history.`,
        status: 'success',
        duration: 4000,
        isClosable: true,
      });
      setReport(updated);
      setIsRevisionOpen(false);
      loadData(id!);
    } catch (err: any) {
      toast({
        title: 'Revision failed',
        description: err.response?.data?.message || err.message,
        status: 'error',
        duration: 4000,
      });
    } finally {
      setIsSubmittingRevision(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!report) return;
    try {
      await reportsApi.downloadPdf(report.id, report.requestNumber);
      toast({
        title: 'PDF generated',
        description: 'Certified Heat Treatment Test Certificate downloaded.',
        status: 'success',
        duration: 3000,
      });
    } catch (err: any) {
      toast({
        title: 'Download failed',
        description: 'Could not export PDF. Please use browser print as fallback.',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Layout>
      {/* Top Header & Actions */}
      <Flex
        justify="space-between"
        align="center"
        mb={6}
        wrap="wrap"
        gap={3}
        className="no-print"
      >
        <Button
          size="sm"
          variant="outline"
          leftIcon={<ArrowLeft size={16} />}
          onClick={() => navigate(isPE ? '/requests' : '/tasks')}
        >
          Back to List
        </Button>

        {report && (
          <HStack gap={2}>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Printer size={16} />}
              onClick={handlePrint}
            >
              Print Certificate
            </Button>
            <Button
              size="sm"
              colorScheme="brand"
              leftIcon={<Download size={16} />}
              onClick={handleDownloadPdf}
            >
              Download PDF
            </Button>
            <Button
              size="sm"
              variant="outline"
              colorScheme="orange"
              leftIcon={<Edit3 size={15} />}
              onClick={handleOpenRevisionModal}
            >
              Revise Report
            </Button>
            {isPE && (
              <Button
                size="sm"
                variant="outline"
                colorScheme="red"
                leftIcon={<Trash2 size={15} />}
                onClick={() => setIsVoidModalOpen(true)}
              >
                Void / Delete
              </Button>
            )}
          </HStack>
        )}
      </Flex>

      {/* =========================================================================
          VIEW MODE: READ-ONLY OFFICIAL REPORT SNAPSHOT & PRINTABLE VIEW
          ========================================================================= */}
      {report ? (
        <Card
          bg={cardBg}
          p={{ base: 6, md: 8 }}
          borderRadius="xl"
          borderWidth="1px"
          borderColor={cardBorder}
          boxShadow="sm"
          className="printable-content"
        >
          <CardBody p={0}>
          {/* Certificate Header */}
          <Flex
            justify="space-between"
            align={{ base: 'flex-start', sm: 'center' }}
            direction={{ base: 'column', sm: 'row' }}
            gap={4}
            borderBottomWidth="2px"
            borderColor={useColorModeValue('industrial.800', 'gray.600')}
            pb={4}
            mb={6}
          >
            <HStack gap={3}>
              <Flex
                w={10}
                h={10}
                bg="orange.500"
                borderRadius="md"
                align="center"
                justify="center"
              >
                <Icon as={Flame} boxSize={6} color="white" />
              </Flex>
              <Box>
                <Heading size="md" fontWeight="800" color={headingColor} letterSpacing="wide">
                  {report.moduleType === 'LINE_INSPECTION'
                    ? 'LINE ASSEMBLY INSPECTION REPORT'
                    : 'HEAT TREATMENT INSPECTION REPORT'}
                </Heading>
                <Text fontSize="2xs" color="gray.500" fontWeight="700" letterSpacing="widest">
                  {report.moduleType === 'LINE_INSPECTION'
                    ? 'OFFICIAL INLINE QUALITY VERIFICATION & AUDIT RECORD'
                    : 'OFFICIAL METALLURGICAL TEST CERTIFICATE & AUDIT RECORD'}
                </Text>
              </Box>
            </HStack>

            <VStack align="flex-end" gap={1}>
              <HStack gap={2}>
                <Text fontSize="xs" fontWeight="700" color="gray.500">
                  OVERALL RESULT:
                </Text>
                <StatusBadge status={report.overallStatus} />
              </HStack>
              <Text fontSize="2xs" color="gray.500" fontFamily="mono">
                Revision #{report.revisions?.length ? report.revisions.length + 1 : 1}
              </Text>
            </VStack>
          </Flex>

          {/* Report Meta Grid */}
          <Box bg={panelBg} p={4} borderRadius="lg" mb={6}>
            <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
              <Box>
                <Text fontSize="2xs" fontWeight="700" color="gray.500" textTransform="uppercase">
                  Request Number
                </Text>
                <Text fontSize="sm" fontWeight="700" fontFamily="mono" color="brand.600">
                  {report.requestNumber}
                </Text>
              </Box>
              <Box>
                <Text fontSize="2xs" fontWeight="700" color="gray.500" textTransform="uppercase">
                  Shift
                </Text>
                <Box mt={0.5}>
                  <Badge
                    colorPalette={
                      (request?.shift || (report as any).shift || 'Shift 1') === 'Shift 1' ? 'blue' :
                      (request?.shift || (report as any).shift || 'Shift 1') === 'Shift 2' ? 'orange' :
                      (request?.shift || (report as any).shift || 'Shift 1') === 'Shift 3' ? 'purple' : 'teal'
                    }
                    size="sm"
                    variant="subtle"
                    fontWeight="700"
                  >
                    {request?.shift || (report as any).shift || 'Shift 1'}
                  </Badge>
                </Box>
              </Box>
              <Box>
                <Text fontSize="2xs" fontWeight="700" color="gray.500" textTransform="uppercase">
                  Report Date
                </Text>
                <Text fontSize="sm" fontWeight="600" color={headingColor}>
                  {report.reportDate}
                </Text>
              </Box>
              <Box>
                <Text fontSize="2xs" fontWeight="700" color="gray.500" textTransform="uppercase">
                  Part Name
                </Text>
                <Text fontSize="sm" fontWeight="700" color={headingColor}>
                  {report.partName}
                </Text>
              </Box>
              <Box>
                <Text fontSize="2xs" fontWeight="700" color="gray.500" textTransform="uppercase">
                  Part Number
                </Text>
                <Text fontSize="sm" fontWeight="700" fontFamily="mono" color={headingColor}>
                  {report.partNumber}
                </Text>
              </Box>
              <Box>
                <Text fontSize="2xs" fontWeight="700" color="gray.500" textTransform="uppercase">
                  HT Batch Number
                </Text>
                <Text fontSize="sm" fontWeight="600" color={headingColor}>
                  {report.heatBatchNumber}
                </Text>
              </Box>
              <Box>
                <Text fontSize="2xs" fontWeight="700" color="gray.500" textTransform="uppercase">
                  Furnace
                </Text>
                <Text fontSize="sm" fontWeight="600" color={headingColor}>
                  {report.furnace}
                </Text>
              </Box>
              <Box>
                <Text fontSize="2xs" fontWeight="700" color="gray.500" textTransform="uppercase">
                  Auto Report No.
                </Text>
                <Text fontSize="sm" fontWeight="600" color={headingColor}>
                  {report.autoReport}
                </Text>
              </Box>
              <Box>
                <Text fontSize="2xs" fontWeight="700" color="gray.500" textTransform="uppercase">
                  Sample Batch Date
                </Text>
                <Text fontSize="sm" fontWeight="600" color={headingColor}>
                  {report.sampleBatchDate}
                </Text>
              </Box>
            </SimpleGrid>
          </Box>

          {/* Metallurgical Test Results Table */}
          <Heading size="xs" textTransform="uppercase" letterSpacing="wider" color={subHeadingColor} mb={3}>
            Laboratory Test Measurements & Compliance Verification
          </Heading>

          <SimpleGrid columns={{ base: 1, md: 2 }} gap={6} mb={6}>
            {/* Hardness Test */}
            <Box
              p={4}
              borderWidth="1px"
              borderColor={cardBorder}
              borderRadius="lg"
              bg={cardBg}
            >
              <Flex justify="space-between" align="center" mb={3}>
                <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase">
                  Hardness Test (Brinell)
                </Text>
                <StatusBadge status={report.hardnessStatus} />
              </Flex>
              <HStack justify="space-between" bg={subPanelBg} p={3} borderRadius="md">
                <Box>
                  <Text fontSize="2xs" color="gray.500">
                    TEST VALUE
                  </Text>
                  <Text fontSize="xl" fontWeight="800" fontFamily="mono" color={headingColor}>
                    {report.bhn} <Text as="span" fontSize="xs">BHN</Text>
                  </Text>
                </Box>
                <Box textAlign="right">
                  <Text fontSize="2xs" color="gray.500">
                    SPECIFICATION THRESHOLD
                  </Text>
                  <Text fontSize="xs" fontWeight="700" color={headingColor}>
                    &ge; 80.00 BHN
                  </Text>
                </Box>
              </HStack>
            </Box>

            {/* Mechanical Tensile Tests */}
            <Box
              p={4}
              borderWidth="1px"
              borderColor={cardBorder}
              borderRadius="lg"
              bg={cardBg}
            >
              <Flex justify="space-between" align="center" mb={3}>
                <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase">
                  Mechanical Properties
                </Text>
                <StatusBadge status={report.mechanicalStatus} />
              </Flex>

              <SimpleGrid columns={3} gap={2} bg={subPanelBg} p={2.5} borderRadius="md">
                <Box>
                  <Text fontSize="2xs" color="gray.500">
                    YS (&ge;220 MPa)
                  </Text>
                  <Text fontSize="md" fontWeight="800" fontFamily="mono">
                    {report.ys}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="2xs" color="gray.500">
                    UTS (&ge;280 MPa)
                  </Text>
                  <Text fontSize="md" fontWeight="800" fontFamily="mono">
                    {report.uts}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="2xs" color="gray.500">
                    E (&ge;1.00 %)
                  </Text>
                  <Text fontSize="md" fontWeight="800" fontFamily="mono">
                    {report.elongation}%
                  </Text>
                </Box>
              </SimpleGrid>
            </Box>
          </SimpleGrid>

          {/* Inspector Remarks */}
          {report.inspectorRemarks && (
            <Box mb={6} p={4} borderWidth="1px" borderColor={cardBorder} borderRadius="lg" bg={subPanelBg}>
              <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" mb={1}>
                Inspector Remarks & Non-Conformance Assessment
              </Text>
              <Text fontSize="sm" color={headingColor}>
                {report.inspectorRemarks}
              </Text>
            </Box>
          )}

          {/* Inspector Signature Snapshot & Certification Footer */}
          <Flex
            justify="space-between"
            align="flex-end"
            borderTopWidth="2px"
            borderColor={cardBorder}
            pt={6}
            wrap="wrap"
            gap={4}
          >
            <Box>
              <Text fontSize="xs" fontWeight="700" color="gray.500">
                CERTIFYING QUALITY INSPECTOR
              </Text>
              <Text fontSize="sm" fontWeight="800" color={headingColor} mt={0.5}>
                {report.inspectorName}
              </Text>
              <Text fontSize="2xs" color="gray.400" fontFamily="mono" mt={0.5}>
                Submitted: {new Date(report.submissionTimestamp).toLocaleString()}
              </Text>
            </Box>

            <Box textAlign="right">
              <Text fontSize="xs" fontWeight="700" color="gray.500" mb={2}>
                DIGITAL SIGNATURE SNAPSHOT (IMMUTABLE)
              </Text>
              <Box
                borderWidth="1px"
                borderColor={sigBoxBorder}
                p={2}
                borderRadius="md"
                bg={sigBoxBg}
                display="inline-block"
              >
                <Image
                  src={report.inspectorSignatureSnapshot}
                  alt="Inspector Signature"
                  maxH="65px"
                  objectFit="contain"
                />
              </Box>
            </Box>
          </Flex>

          {/* Revision History Section if revised */}
          {report.revisions && report.revisions.length > 0 && (
            <Box mt={8} pt={6} borderTopWidth="1px" borderColor={cardBorder} className="no-print">
              <HStack gap={2} mb={3}>
                <Icon as={History} boxSize={4} color="orange.600" />
                <Heading size="xs" textTransform="uppercase" color={subHeadingColor}>
                  Audit Revisions History ({report.revisions.length})
                </Heading>
              </HStack>
              <VStack gap={2} align="stretch">
                {report.revisions.map((rev) => (
                  <Box
                    key={rev.id}
                    p={3}
                    bg={subPanelBg}
                    borderRadius="md"
                    borderLeftWidth="3px"
                    borderLeftColor="qc.status.pending.bg"
                  >
                    <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
                      <Box>
                        <Text fontSize="xs" fontWeight="700">
                          Revision #{rev.revisionNumber} &bull; Revised by {rev.revisedBy}
                        </Text>
                        <Text fontSize="xs" color={textColor} mt={0.5}>
                          Reason: {rev.reason}
                        </Text>
                      </Box>
                      <Text fontSize="2xs" color="gray.400" fontFamily="mono">
                        {new Date(rev.createdAt).toLocaleString()}
                      </Text>
                    </Flex>
                  </Box>
                ))}
              </VStack>
            </Box>
          )}
        </CardBody>
      </Card>
      ) : isPE ? (
        /* =========================================================================
           PE GUARD: READ-ONLY NOTICE FOR UNCOMPLETED INSPECTION REQUESTS
           ========================================================================= */
        <Card
          bg={cardBg}
          p={{ base: 6, md: 8 }}
          borderRadius="xl"
          borderWidth="1px"
          borderColor={cardBorder}
          boxShadow="sm"
        >
          <CardBody p={0}>
            <Alert status="info" borderRadius="md" mb={6}>
              <AlertIcon />
              <Box>
                <AlertTitle fontSize="sm" fontWeight="700">
                  Inspection In Progress
                </AlertTitle>
                <AlertDescription fontSize="xs">
                  This inspection request is currently awaiting metallurgical laboratory testing and report submission by the assigned Quality Inspector ({request?.assignedInspectorName || 'Assigned Inspector'}). Production Engineers can review the certified report here once completed.
                </AlertDescription>
              </Box>
            </Alert>

            <Box bg={panelBg} p={4} borderRadius="lg" mb={6}>
              <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" mb={3}>
                INSPECTION REQUEST REFERENCE (READ-ONLY)
              </Text>
              <SimpleGrid columns={{ base: 2, md: 5 }} gap={4}>
                <Box>
                  <Text fontSize="2xs" color="gray.500" fontWeight="700">
                    REQUEST NUMBER
                  </Text>
                  <Text fontSize="sm" fontWeight="700" fontFamily="mono" color="brand.600">
                    {request?.requestNumber}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="2xs" color="gray.500" fontWeight="700">
                    SHIFT
                  </Text>
                  <Box mt={0.5}>
                    <Badge
                      colorPalette={
                        (request?.shift || 'Shift 1') === 'Shift 1' ? 'blue' :
                        (request?.shift || 'Shift 1') === 'Shift 2' ? 'orange' :
                        (request?.shift || 'Shift 1') === 'Shift 3' ? 'purple' : 'teal'
                      }
                      size="sm"
                      variant="subtle"
                      fontWeight="700"
                    >
                      {request?.shift || 'Shift 1'}
                    </Badge>
                  </Box>
                </Box>
                <Box>
                  <Text fontSize="2xs" color="gray.500" fontWeight="700">
                    PART NAME
                  </Text>
                  <Text fontSize="sm" fontWeight="700" color={headingColor}>
                    {request?.partName}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="2xs" color="gray.500" fontWeight="700">
                    PART NUMBER
                  </Text>
                  <Text fontSize="sm" fontWeight="700" fontFamily="mono" color={headingColor}>
                    {request?.partNumber}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="2xs" color="gray.500" fontWeight="700">
                    CURRENT STATUS
                  </Text>
                  <StatusBadge status={request?.status || 'Assigned'} />
                </Box>
              </SimpleGrid>
            </Box>

            <Flex justify="flex-end">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<ArrowLeft size={16} />}
                onClick={() => navigate('/requests')}
              >
                Back to Inspection Requests
              </Button>
            </Flex>
          </CardBody>
        </Card>
      ) : (
        /* =========================================================================
           ENTRY MODE: QUALITY INSPECTOR ENTRY FORM WITH LIVE CALCULATIONS
           ========================================================================= */
        <Card
          as="form"
          onSubmit={handleSubmitReport}
          bg={cardBg}
          p={{ base: 6, md: 8 }}
          borderRadius="xl"
          borderWidth="1px"
          borderColor={cardBorder}
          boxShadow="sm"
        >
          <CardBody p={0}>
            {/* Header */}
            <Flex justify="space-between" align="flex-start" wrap="wrap" gap={4} mb={6}>
              <Box>
                <HStack gap={3}>
                  <Heading size="md" fontWeight="800" color={headingColor}>
                    Heat Treatment Inspection Report Entry
                  </Heading>
                  <Badge colorScheme="orange">In Progress</Badge>
                </HStack>
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Enter metallurgical laboratory measurements. Statuses are calculated in real time.
                </Text>
              </Box>
            </Flex>

            {/* Request-Derived Read-Only Fields */}
            <Box bg={panelBg} p={4} borderRadius="lg" mb={6}>
              <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" mb={3}>
                INSPECTION REQUEST REFERENCE (READ-ONLY)
              </Text>
              <SimpleGrid columns={{ base: 2, md: 5 }} gap={4}>
                <Box>
                  <Text fontSize="2xs" color="gray.500" fontWeight="700">
                    REQUEST NUMBER
                  </Text>
                  <Text fontSize="sm" fontWeight="700" fontFamily="mono" color="brand.600">
                    {request?.requestNumber}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="2xs" color="gray.500" fontWeight="700">
                    SHIFT
                  </Text>
                  <Box mt={0.5}>
                    <Badge
                      colorPalette={
                        (request?.shift || 'Shift 1') === 'Shift 1' ? 'blue' :
                        (request?.shift || 'Shift 1') === 'Shift 2' ? 'orange' :
                        (request?.shift || 'Shift 1') === 'Shift 3' ? 'purple' : 'teal'
                      }
                      size="sm"
                      variant="subtle"
                      fontWeight="700"
                    >
                      {request?.shift || 'Shift 1'}
                    </Badge>
                  </Box>
                </Box>
                <Box>
                  <Text fontSize="2xs" color="gray.500" fontWeight="700">
                    PART NAME
                  </Text>
                  <Text fontSize="sm" fontWeight="700" color={headingColor}>
                    {request?.partName}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="2xs" color="gray.500" fontWeight="700">
                    PART NUMBER
                  </Text>
                  <Text fontSize="sm" fontWeight="700" fontFamily="mono" color={headingColor}>
                    {request?.partNumber}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="2xs" color="gray.500" fontWeight="700">
                    ASSIGNED INSPECTOR
                  </Text>
                  <Text fontSize="sm" fontWeight="700" color="brand.600">
                    {request?.assignedInspectorName || user?.fullName}
                  </Text>
                </Box>
              </SimpleGrid>
            </Box>

            {isLineModule ? (
              <Box mb={6}>
                <LineInspectionForm
                  data={lineData}
                  onChange={handleLineDataChange}
                  evaluation={lineEvaluation}
                />
              </Box>
            ) : (
              <>
                {/* Section 1: Report Metadata Inputs */}
                <Heading size="xs" textTransform="uppercase" letterSpacing="wider" color={subHeadingColor} mb={4}>
                  1. Report & Batch Metadata
                </Heading>

            <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} gap={4} mb={6}>
              <DatePicker
                id="reportDate"
                label="REPORT DATE"
                isRequired
                value={reportDate}
                onChange={setReportDate}
                isInvalid={hasAttemptedSubmit && !reportDate}
                errorMessage="Report date is required."
              />

              <FormField
                id="heatBatchNumber"
                label="HEAT TREATMENT BATCH NUMBER"
                placeholder="e.g. HT-2026-B892"
                isRequired
                value={heatBatchNumber}
                onChange={(e) => setHeatBatchNumber(e.target.value)}
                isInvalid={hasAttemptedSubmit && !heatBatchNumber.trim()}
                errorMessage="Heat batch number is required."
              />

              <FormField
                id="furnace"
                label="FURNACE IDENTIFIER"
                placeholder="e.g. Furnace-03 Vacuum"
                isRequired
                value={furnace}
                onChange={(e) => setFurnace(e.target.value)}
                isInvalid={hasAttemptedSubmit && !furnace.trim()}
                errorMessage="Furnace identifier is required."
              />

              <FormField
                id="autoReport"
                label="AUTO REPORT NUMBER"
                placeholder="e.g. AR-8890"
                isRequired
                value={autoReport}
                onChange={(e) => setAutoReport(e.target.value)}
                isInvalid={hasAttemptedSubmit && !autoReport.trim()}
                errorMessage="Auto report number is required."
              />

              <DatePicker
                id="sampleBatchDate"
                label="SAMPLE RECEIVED BATCH DATE"
                isRequired
                value={sampleBatchDate}
                onChange={setSampleBatchDate}
                isInvalid={hasAttemptedSubmit && !sampleBatchDate}
                errorMessage="Sample received batch date is required."
              />
            </SimpleGrid>

            <Divider my={6} borderColor={cardBorder} />

            {/* Section 2: Metallurgical Test Entry with Live Preview */}
            <Heading size="xs" textTransform="uppercase" letterSpacing="wider" color={subHeadingColor} mb={4}>
              2. Metallurgical Measurements & Real-Time Calculated Status
            </Heading>

            <SimpleGrid columns={{ base: 1, md: 2 }} gap={6} mb={6}>
              {/* Hardness Input & Calculation */}
              <Box p={4} borderWidth="1px" borderColor={cardBorder} borderRadius="lg" bg={subPanelBg}>
                <Flex justify="space-between" align="center" mb={2}>
                  <Text fontSize="xs" fontWeight="700" color={subHeadingColor} textTransform="uppercase">
                    Hardness (Brinell)
                  </Text>
                  <HStack gap={1}>
                    <Text fontSize="2xs" color="gray.500">
                      STATUS:
                    </Text>
                    <StatusBadge status={hasBhn ? hardnessStatus : 'PENDING'} />
                  </HStack>
                </Flex>

                <FormField
                  id="bhn"
                  label="SPEC / HARDNESS"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 85.50"
                  unit="BHN"
                  isRequired
                  value={bhn}
                  onChange={(e) => setBhn(e.target.value)}
                  isInvalid={(hasAttemptedSubmit && !bhn.trim()) || (hasBhn && (numBhn < 0 || numBhn > 3000))}
                  errorMessage={
                    hasBhn && numBhn < 0
                      ? 'Hardness must be non-negative.'
                      : hasBhn && numBhn > 3000
                      ? 'Hardness cannot exceed 3000 BHN.'
                      : 'Hardness test value is required.'
                  }
                  helperText="Specification Threshold: ≥ 80.00 BHN → OK"
                />
              </Box>

              {/* Mechanical Properties & Calculation */}
              <Box p={4} borderWidth="1px" borderColor={cardBorder} borderRadius="lg" bg={subPanelBg}>
                <Flex justify="space-between" align="center" mb={2}>
                  <Text fontSize="xs" fontWeight="700" color={subHeadingColor} textTransform="uppercase">
                    Mechanical Properties
                  </Text>
                  <HStack gap={1}>
                    <Text fontSize="2xs" color="gray.500">
                      STATUS:
                    </Text>
                    <StatusBadge status={hasMechanical ? mechanicalStatus : 'PENDING'} />
                  </HStack>
                </Flex>

                <SimpleGrid columns={{ base: 1, sm: 3 }} gap={3}>
                  <FormField
                    id="ys"
                    label="YIELD STRENGTH"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 240.0"
                    unit="MPa"
                    isRequired
                    value={ys}
                    onChange={(e) => setYs(e.target.value)}
                    isInvalid={(hasAttemptedSubmit && !ys.trim()) || (hasMechanical && (numYs < 0 || numYs > 5000))}
                    errorMessage={
                      hasMechanical && numYs < 0
                        ? 'YS must be non-negative.'
                        : hasMechanical && numYs > 5000
                        ? 'YS cannot exceed 5000 MPa.'
                        : 'Yield strength is required.'
                    }
                    helperText="Threshold: ≥ 220 MPa"
                  />

                  <FormField
                    id="uts"
                    label="TENSILE STRENGTH"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 310.0"
                    unit="MPa"
                    isRequired
                    value={uts}
                    onChange={(e) => setUts(e.target.value)}
                    isInvalid={(hasAttemptedSubmit && !uts.trim()) || (hasMechanical && (numUts < 0 || numUts > 5000))}
                    errorMessage={
                      hasMechanical && numUts < 0
                        ? 'UTS must be non-negative.'
                        : hasMechanical && numUts > 5000
                        ? 'UTS cannot exceed 5000 MPa.'
                        : 'Tensile strength is required.'
                    }
                    helperText="Threshold: ≥ 280 MPa"
                  />

                  <FormField
                    id="elongation"
                    label="ELONGATION"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 2.50"
                    unit="%"
                    isRequired
                    value={elongation}
                    onChange={(e) => setElongation(e.target.value)}
                    isInvalid={(hasAttemptedSubmit && !elongation.trim()) || (hasMechanical && (numE < 0 || numE > 100))}
                    errorMessage={
                      hasMechanical && numE < 0
                        ? 'Elongation must be non-negative.'
                        : hasMechanical && numE > 100
                        ? 'Elongation cannot exceed 100%.'
                        : 'Elongation is required.'
                    }
                    helperText="Threshold: ≥ 1.00%"
                  />
                </SimpleGrid>
              </Box>
            </SimpleGrid>

          {/* Overall Status Banner */}
          <Box
            p={4}
            borderRadius="lg"
            bg={
              hasBhn || hasMechanical
                ? overallStatus === 'OK'
                  ? useColorModeValue('green.50', 'rgba(16, 185, 129, 0.12)')
                  : useColorModeValue('red.50', 'rgba(239, 68, 68, 0.12)')
                : subPanelBg
            }
            borderWidth="2px"
            borderColor={
              hasBhn || hasMechanical
                ? overallStatus === 'OK'
                  ? 'qc.status.ok.bg'
                  : 'qc.status.notOk.bg'
                : cardBorder
            }
            mb={6}
          >
            <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
              <HStack gap={3}>
                <Icon
                  as={overallStatus === 'OK' ? CheckCircle : AlertTriangle}
                  boxSize={6}
                  color={overallStatus === 'OK' ? 'qc.status.ok.bg' : 'qc.status.notOk.bg'}
                />
                <Box>
                  <Text fontSize="xs" fontWeight="700" color="gray.400">
                    COMPUTED OVERALL INSPECTION STATUS
                  </Text>
                  <Text fontSize="sm" fontWeight="800" color={headingColor}>
                    {hasBhn || hasMechanical
                      ? overallStatus === 'OK'
                        ? 'COMPLIANT: All hardness and mechanical property standards met.'
                        : 'NON-CONFORMANCE DETECTED: One or more properties failed specifications.'
                      : 'Awaiting numerical test values above...'}
                  </Text>
                </Box>
              </HStack>
              <StatusBadge status={hasBhn || hasMechanical ? overallStatus : 'PENDING'} />
            </Flex>
          </Box>
        </>
      )}

          {/* Inspector Remarks (Strictly Mandatory on NOT OK) */}
          <FormControl isRequired={isRemarksMandatory} isInvalid={isRemarksMandatory && !inspectorRemarks.trim()} mb={6}>
            <HStack justify="space-between" mb={1}>
              <FormLabel
                fontSize="xs"
                fontWeight="700"
                color={isRemarksMandatory ? 'red.400' : subHeadingColor}
                m={0}
              >
                INSPECTOR REMARKS {isRemarksMandatory && '(STRICTLY MANDATORY FOR NOT OK)'}
              </FormLabel>
              {isRemarksMandatory && (
                <Badge colorScheme="red" fontSize="10px">
                  Required on Not OK
                </Badge>
              )}
            </HStack>
            <Textarea
              placeholder={
                isRemarksMandatory
                  ? 'Detailed non-conformance notes and recommended disposition are required when overall status is Not OK...'
                  : 'Optional inspector comments, micro-structure notes, or heat treatment observations...'
              }
              value={inspectorRemarks}
              onChange={(e) => setInspectorRemarks(e.target.value)}
              rows={3}
              borderColor={isRemarksMandatory ? 'red.500' : undefined}
            />
            {isRemarksMandatory && !inspectorRemarks.trim() && (
              <FormErrorMessage fontSize="2xs">
                Inspector Remarks are strictly mandatory when Overall Status is Not OK.
              </FormErrorMessage>
            )}
          </FormControl>

          <Divider my={6} borderColor={cardBorder} />

          {/* Section 3: Digital Signature Confirmation */}
          <Heading size="xs" textTransform="uppercase" letterSpacing="wider" color={subHeadingColor} mb={4}>
            3. Digital Signature & Legal Certification
          </Heading>

          {user?.signatureData ? (
            <Box p={4} borderWidth="1px" borderColor={cardBorder} borderRadius="lg" bg={subPanelBg} mb={6}>
              <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
                <Box>
                  <Text fontSize="xs" fontWeight="700" color={headingColor}>
                    Certifying Quality Inspector: {user.fullName}
                  </Text>
                  <Text fontSize="2xs" color="gray.500">
                    Your saved digital signature will be captured as an immutable snapshot.
                  </Text>
                </Box>
                <Box p={2} bg={sigBoxBg} borderRadius="md" borderWidth="1px" borderColor={sigBoxBorder}>
                  <Image
                    src={user.signatureData}
                    alt="Active Signature"
                    maxH="45px"
                    objectFit="contain"
                  />
                </Box>
              </Flex>

              <Checkbox
                mt={3}
                isChecked={confirmedSignature}
                onChange={(e: any) => setConfirmedSignature(e.target.checked)}
                colorScheme="brand"
              >
                <Text fontSize="xs" fontWeight="600" color={headingColor}>
                  I certify that all test measurements are accurate and hereby apply my digital signature snapshot to this report.
                </Text>
              </Checkbox>
            </Box>
          ) : (
            <Box mb={6}>
              <Alert status="warning" borderRadius="md" mb={4}>
                <AlertIcon />
                <Box>
                  <AlertTitle fontSize="xs" fontWeight="700">
                    No Digital Signature on File
                  </AlertTitle>
                  <AlertDescription fontSize="xs">
                    You must draw and save your signature below before completing submission.
                  </AlertDescription>
                </Box>
              </Alert>
              <SignaturePad
                onSave={async (sig) => {
                  await updateSignature(sig);
                  setConfirmedSignature(true);
                  setShowInlineSigPad(false);
                  toast({
                    title: 'Signature saved',
                    description: 'Ready to submit report.',
                    status: 'success',
                  });
                }}
              />
            </Box>
          )}

          {/* Submission Button */}
          <Flex justify="flex-end" gap={3}>
            <Button
              variant="outline"
              size="md"
              onClick={() => navigate('/tasks')}
              isDisabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              colorScheme="brand"
              size="md"
              leftIcon={<Send size={16} />}
              isLoading={isSubmitting}
              isDisabled={
                isLineModule
                  ? !confirmedSignature ||
                    (lineEvaluation.overallStatus === 'NOT_OK' && !inspectorRemarks.trim())
                  : !hasBhn ||
                    !hasMechanical ||
                    !heatBatchNumber ||
                    !furnace ||
                    !autoReport ||
                    (isRemarksMandatory && !inspectorRemarks.trim()) ||
                    !confirmedSignature
              }
            >
              Submit Official Inspection Report
            </Button>
          </Flex>
        </CardBody>
      </Card>
    )}

      {/* Revision Modal */}
      <Modal
        isOpen={isRevisionOpen}
        onClose={() => setIsRevisionOpen(false)}
        size="lg"
        isCentered
        blockScrollOnMount={false}
        preserveScrollBarGap={true}
        motionPreset="slide-in-bottom"
      >
        <ModalOverlay bg="blackAlpha.600" />
        <ModalContent as="form" onSubmit={handleSubmitRevision} bg={cardBg} borderColor={cardBorder}>
          <ModalHeader fontSize="md" fontWeight="800" color={headingColor} borderBottomWidth="1px" borderColor={cardBorder}>
            Controlled Report Revision
          </ModalHeader>
          <ModalCloseButton disabled={isSubmittingRevision} />
          <ModalBody py={4}>
            <VStack gap={4} align="stretch">
              <Alert status="info" borderRadius="md">
                <AlertIcon />
                <Text fontSize="xs">
                  Submitting a revision archives the current snapshot to audit history and increments the revision counter.
                </Text>
              </Alert>

              <FormControl isRequired>
                <FormLabel fontSize="xs" fontWeight="700">
                  AUDITED REVISION REASON
                </FormLabel>
                <Textarea
                  placeholder="e.g. Tensile re-test per ASTM E8, recalibration correction..."
                  value={revisionReason}
                  onChange={(e) => setRevisionReason(e.target.value)}
                  rows={2}
                />
              </FormControl>

              <SimpleGrid columns={2} gap={3}>
                <FormField
                  id="revBhn"
                  label="HARDNESS"
                  type="number"
                  step="0.01"
                  min="0"
                  unit="BHN"
                  isRequired
                  value={revBhn}
                  onChange={(e) => setRevBhn(e.target.value)}
                  isInvalid={Number(revBhn) < 0}
                  errorMessage="Must be non-negative"
                  helperText="Threshold: ≥ 80.00 BHN"
                />

                <FormField
                  id="revYs"
                  label="YIELD STRENGTH"
                  type="number"
                  step="0.01"
                  min="0"
                  unit="MPa"
                  isRequired
                  value={revYs}
                  onChange={(e) => setRevYs(e.target.value)}
                  isInvalid={Number(revYs) < 0}
                  errorMessage="Must be non-negative"
                  helperText="Threshold: ≥ 220 MPa"
                />

                <FormField
                  id="revUts"
                  label="TENSILE STRENGTH"
                  type="number"
                  step="0.01"
                  min="0"
                  unit="MPa"
                  isRequired
                  value={revUts}
                  onChange={(e) => setRevUts(e.target.value)}
                  isInvalid={Number(revUts) < 0}
                  errorMessage="Must be non-negative"
                  helperText="Threshold: ≥ 280 MPa"
                />

                <FormField
                  id="revElongation"
                  label="ELONGATION"
                  type="number"
                  step="0.01"
                  min="0"
                  unit="%"
                  isRequired
                  value={revElongation}
                  onChange={(e) => setRevElongation(e.target.value)}
                  isInvalid={Number(revElongation) < 0}
                  errorMessage="Must be non-negative"
                  helperText="Threshold: ≥ 1.00%"
                />
              </SimpleGrid>

              <HStack justify="space-between" bg={subPanelBg} p={2} borderRadius="md">
                <Text fontSize="xs" fontWeight="700">
                  CALCULATED OVERALL STATUS:
                </Text>
                <StatusBadge status={revOverallStatus} />
              </HStack>

              <FormControl isRequired={isRevRemarksMandatory}>
                <FormLabel fontSize="xs" fontWeight="700">
                  REVISION REMARKS {isRevRemarksMandatory && '(REQUIRED FOR NOT OK)'}
                </FormLabel>
                <Textarea
                  value={revRemarks}
                  onChange={(e) => setRevRemarks(e.target.value)}
                  rows={2}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsRevisionOpen(false)}
              isDisabled={isSubmittingRevision}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              colorScheme="brand"
              size="sm"
              isLoading={isSubmittingRevision}
              isDisabled={!revisionReason.trim()}
            >
              Commit Revision
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Void / Delete Report Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isVoidModalOpen}
        onClose={() => setIsVoidModalOpen(false)}
        onConfirm={handleVoidReport}
        title="Void & Delete Inspection Report"
        description="Are you sure you want to void and delete this official inspection report? The associated request will revert to In Progress so it can be re-inspected. This action is permanently audited."
        confirmLabel="Void & Delete Report"
        isDestructive
        isLoading={isVoiding}
      />
    </Layout>
  );
};
