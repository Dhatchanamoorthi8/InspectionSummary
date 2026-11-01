import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Flex,
  Button,
  HStack,
  VStack,
  SimpleGrid,
  Badge,
} from '@chakra-ui/react';
import {
  ArrowLeft,
  UserCheck,
  XCircle,
  FileText,
  Trash2,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { StatusBadge } from '../components/StatusBadge';
import {
  ConfirmationDialog,
  Card,
  CardBody,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  useToast,
  useColorModeValue,
} from '../components/ui';
import { ReassignInspectorModal } from '../components/ReassignInspectorModal';
import { EmptyState } from '../components/EmptyState';
import { requestsApi, usersApi, auditApi } from '../services/api';
import { InspectionRequest, User, AuditLog } from '../types';
import { useAuth } from '../context/AuthContext';

export const RequestDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [request, setRequest] = useState<InspectionRequest | null>(null);
  const [inspectors, setInspectors] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [isReassigning, setIsReassigning] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isPE = user?.role === 'PRODUCTION_ENGINEER';

  // Theme-aware tokens
  const cardBg = useColorModeValue('white', 'gray.800');
  const cardBorder = useColorModeValue('gray.200', 'gray.700');
  const panelBg = useColorModeValue('industrial.50', 'gray.850');
  const subPanelBg = useColorModeValue('gray.50', 'gray.900');
  const headingColor = useColorModeValue('industrial.900', 'white');
  const textColor = useColorModeValue('gray.600', 'gray.300');
  const partNumberColor = useColorModeValue('gray.700', 'gray.300');

  useEffect(() => {
    if (id) {
      loadRequestData(id);
    }
  }, [id]);

  const loadRequestData = async (reqId: string) => {
    setIsLoading(true);
    try {
      const [req, inspList, audits] = await Promise.all([
        requestsApi.getRequestById(reqId),
        usersApi.getInspectors(),
        auditApi.getAuditLogs({ entityId: reqId }),
      ]);
      setRequest(req);
      setInspectors(inspList.filter((i) => i.isActive));
      setAuditLogs(audits);
    } catch (err: any) {
      toast({
        title: 'Error loading request',
        description: err.response?.data?.message || err.message,
        status: 'error',
        duration: 3000,
      });
      navigate('/requests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelConfirm = async () => {
    if (!id) return;
    setIsCancelling(true);
    try {
      await requestsApi.cancelRequest(id);
      toast({
        title: 'Request cancelled',
        description: 'Inspection request has been marked Cancelled.',
        status: 'info',
        duration: 3000,
      });
      setIsCancelOpen(false);
      loadRequestData(id);
    } catch (err: any) {
      toast({
        title: 'Cancellation failed',
        description: err.response?.data?.message || err.message,
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await requestsApi.deleteRequest(id);
      toast({
        title: 'Request deleted',
        description: `Inspection request ${request?.requestNumber} has been permanently deleted.`,
        status: 'success',
        duration: 3000,
      });
      setIsDeleteOpen(false);
      navigate('/requests');
    } catch (err: any) {
      toast({
        title: 'Deletion failed',
        description: err.response?.data?.message || err.message,
        status: 'error',
        duration: 4000,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!request && !isLoading) {
    return (
      <Layout>
        <Text>Request not found.</Text>
      </Layout>
    );
  }

  const steps = ['Draft', 'Assigned', 'In Progress', 'Completed'];
  const currentStepIdx = steps.indexOf(request?.status || 'Draft');

  return (
    <Layout>
      {/* Top Navigation & Actions */}
      <Flex justify="space-between" align="center" mb={6} wrap="wrap" gap={3}>
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate(isPE ? '/requests' : '/tasks')}
        >
          <ArrowLeft size={16} style={{ marginRight: 6 }} />
          Back to List
        </Button>
        <HStack gap={2}>
          {isPE && request?.status !== 'Completed' && request?.status !== 'Cancelled' && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsReassignOpen(true)}
              >
                <UserCheck size={16} style={{ marginRight: 6 }} />
                Reassign Inspector
              </Button>
              <Button
                size="sm"
                colorPalette="red"
                variant="outline"
                onClick={() => setIsCancelOpen(true)}
              >
                <XCircle size={16} style={{ marginRight: 6 }} />
                Cancel Request
              </Button>
              <Button
                size="sm"
                colorPalette="red"
                onClick={() => setIsDeleteOpen(true)}
              >
                <Trash2 size={16} style={{ marginRight: 6 }} />
                Delete
              </Button>
            </>
          )}
          {isPE && (request?.status === 'Completed' || request?.status === 'Cancelled') && (
            <Button
              size="sm"
              colorPalette="red"
              variant="outline"
              onClick={() => setIsDeleteOpen(true)}
            >
              <Trash2 size={16} style={{ marginRight: 6 }} />
              Delete Request
            </Button>
          )}
          {request?.status === 'Completed' && (
            <Button
              size="sm"
              colorPalette="green"
              onClick={() => navigate(`/tasks/${request.id}/inspect`)}
            >
              <FileText size={16} style={{ marginRight: 6 }} />
              View Inspection Report
            </Button>
          )}
        </HStack>
      </Flex>

      {/* Main Details Card */}
      <Card
        bg={cardBg}
        borderRadius="xl"
        borderWidth="1px"
        borderColor={cardBorder}
        boxShadow="sm"
        mb={6}
      >
        <CardBody p={{ base: 4, sm: 6 }}>
          <Flex justify="space-between" align="flex-start" wrap="wrap" gap={4} mb={6}>
            <Box>
              <HStack gap={3} wrap="wrap">
                <Heading size="md" fontFamily="mono" color="brand.600">
                  {request?.requestNumber}
                </Heading>
                <StatusBadge status={request?.status} />
                {request?.report && (
                  <HStack gap={1}>
                    <Text fontSize="xs" fontWeight="700" color="gray.500">
                      RESULT:
                    </Text>
                    <StatusBadge status={request.report.overallStatus} />
                  </HStack>
                )}
              </HStack>
              <Text fontSize="xs" color="gray.500" mt={1}>
                Created on {request?.date} &bull; ID: {request?.id}
              </Text>
            </Box>
          </Flex>

          {/* Lifecycle Stepper */}
          {request?.status !== 'Cancelled' && (
            <Box mb={6} bg={panelBg} p={4} borderRadius="lg">
              <Flex justify="space-between" align="center" position="relative">
                {steps.map((step, idx) => {
                  const isPassed = idx <= currentStepIdx;
                  const isCurrent = idx === currentStepIdx;
                  return (
                    <Flex key={step} direction="column" align="center" flex={1} position="relative" zIndex={1}>
                      <Flex
                        w={8}
                        h={8}
                        borderRadius="full"
                        bg={isPassed ? (step === 'Completed' ? 'green.500' : 'brand.600') : 'gray.200'}
                        color={isPassed ? 'white' : 'gray.500'}
                        align="center"
                        justify="center"
                        fontWeight="700"
                        fontSize="xs"
                        boxShadow={isCurrent ? '0 0 0 4px rgba(37, 99, 235, 0.2)' : 'none'}
                      >
                        {idx + 1}
                      </Flex>
                      <Text
                        fontSize="2xs"
                        fontWeight={isCurrent ? '700' : '600'}
                        color={isPassed ? 'industrial.900' : 'gray.400'}
                        mt={1.5}
                        textAlign="center"
                      >
                        {step}
                      </Text>
                    </Flex>
                  );
                })}
              </Flex>
            </Box>
          )}

          {/* Tabbed Content: Details, Assignment History, and Audit Trail */}
          <Tabs defaultValue="overview" variant="subtle" colorPalette="brand">
            <TabList overflowX="auto" pb={1} gap={2}>
              <Tab value="overview" fontWeight="700" fontSize="xs">
                Request Overview
              </Tab>
              <Tab value="history" fontWeight="700" fontSize="xs">
                Assignment History ({request?.assignmentHistory?.length || 0})
              </Tab>
              <Tab value="audit" fontWeight="700" fontSize="xs">
                Audit Trail ({auditLogs.length})
              </Tab>
            </TabList>

            <TabPanels>
              {/* Tab 1: Request Overview */}
              <TabPanel value="overview" px={0} pt={5} pb={0}>
                <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} gap={6}>
                  <Box>
                    <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase">
                      Part Name
                    </Text>
                    <Text fontSize="md" fontWeight="700" color={headingColor} mt={1}>
                      {request?.partName}
                    </Text>
                  </Box>

                  <Box>
                    <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase">
                      Part Number
                    </Text>
                    <Text fontSize="md" fontWeight="700" fontFamily="mono" color={partNumberColor} mt={1}>
                      {request?.partNumber}
                    </Text>
                  </Box>

                  <Box>
                    <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase">
                      Assigned Quality Inspector
                    </Text>
                    <Text fontSize="md" fontWeight="700" color="brand.600" mt={1}>
                      {request?.assignedInspectorName || (
                        <Text as="span" color="orange.500">
                          Unassigned (Draft)
                        </Text>
                      )}
                    </Text>
                  </Box>
                </SimpleGrid>

                {request?.remarks && (
                  <Box mt={6} pt={4} borderTopWidth="1px" borderColor={cardBorder}>
                    <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase">
                      Engineer Remarks & Instructions
                    </Text>
                    <Text fontSize="sm" color={headingColor} mt={1} bg={subPanelBg} p={3} borderRadius="md">
                      {request.remarks}
                    </Text>
                  </Box>
                )}
              </TabPanel>

              {/* Tab 2: Assignment History */}
              <TabPanel value="history" px={0} pt={5} pb={0}>
                {!request?.assignmentHistory || request.assignmentHistory.length === 0 ? (
                  <EmptyState
                    title="No Assignment History"
                    description="No inspector assignment or reassignment history recorded for this request yet."
                  />
                ) : (
                  <VStack gap={3} align="stretch">
                    {request.assignmentHistory.map((hist, idx) => (
                      <Box
                        key={hist.id || idx}
                        p={3}
                        bg={panelBg}
                        borderRadius="md"
                        borderLeftWidth="4px"
                        borderLeftColor="brand.500"
                      >
                        <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
                          <Box>
                            <Text fontSize="xs" fontWeight="700" color={headingColor}>
                              Assigned to: {hist.assignedInspectorName}
                            </Text>
                            <Text fontSize="xs" color={textColor} mt={0.5}>
                              Reason: {hist.reason || 'No reason specified'}
                            </Text>
                          </Box>
                          <Text fontSize="2xs" color="gray.400" fontFamily="mono">
                            By {hist.assignedBy} &bull; {new Date(hist.assignedAt).toLocaleString()}
                          </Text>
                        </Flex>
                      </Box>
                    ))}
                  </VStack>
                )}
              </TabPanel>

              {/* Tab 3: Audit Trail */}
              <TabPanel value="audit" px={0} pt={5} pb={0}>
                {auditLogs.length === 0 ? (
                  <Text fontSize="sm" color="gray.400">
                    No audit log entries found for this request.
                  </Text>
                ) : (
                  <VStack gap={2} align="stretch">
                    {auditLogs.map((log) => (
                      <Flex
                        key={log.id}
                        p={2.5}
                        borderWidth="1px"
                        borderColor={cardBorder}
                        borderRadius="md"
                        justify="space-between"
                        align="center"
                        fontSize="xs"
                        wrap="wrap"
                        gap={2}
                      >
                        <HStack gap={3}>
                          <Badge colorPalette="blue" fontSize="2xs">{log.action}</Badge>
                          <Text fontWeight="600" color={headingColor}>
                            User: {log.username}
                          </Text>
                        </HStack>
                        <Text color="gray.400" fontFamily="mono" fontSize="2xs">
                          {new Date(log.timestamp).toLocaleString()}
                        </Text>
                      </Flex>
                    ))}
                  </VStack>
                )}
              </TabPanel>
            </TabPanels>
          </Tabs>
        </CardBody>
      </Card>

      {/* Reassign Inspector Modal */}
      <ReassignInspectorModal
        isOpen={isReassignOpen}
        onClose={() => setIsReassignOpen(false)}
        requestNumber={request?.requestNumber}
        partName={request?.partName}
        currentInspectorName={request?.assignedInspectorName}
        inspectors={inspectors}
        isLoading={isReassigning}
        onConfirm={async (newInspectorId, reason) => {
          if (!id) return;
          setIsReassigning(true);
          try {
            await requestsApi.assignRequest(
              id,
              newInspectorId,
              reason || 'Inspector reassigned by Production Engineer',
            );
            toast({
              title: 'Reassignment successful',
              description: 'Quality Inspector updated and recorded.',
              status: 'success',
              duration: 3000,
            });
            setIsReassignOpen(false);
            loadRequestData(id);
          } catch (err: any) {
            toast({
              title: 'Reassignment failed',
              description: err.response?.data?.message || err.message,
              status: 'error',
              duration: 3000,
            });
          } finally {
            setIsReassigning(false);
          }
        }}
      />

      {/* Cancel Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        onConfirm={handleCancelConfirm}
        title="Cancel Inspection Request"
        description={`Are you sure you want to cancel ${request?.requestNumber}? This action is irreversible.`}
        confirmLabel="Cancel Request"
        isDestructive
        isLoading={isCancelling}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Inspection Request"
        description={`Are you sure you want to permanently delete inspection request ${request?.requestNumber}? All history will be deleted.`}
        confirmLabel="Delete Request"
        isDestructive
        isLoading={isDeleting}
      />
    </Layout>
  );
};
