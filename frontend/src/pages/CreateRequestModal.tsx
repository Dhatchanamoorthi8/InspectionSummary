import React, { useState, useEffect } from 'react';
import {
  Button,
  Input,
  Textarea,
  VStack,
  HStack,
  Box,
  Text,
  Field,
} from '@chakra-ui/react';
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogCloseTrigger,
  DialogBody,
  DialogFooter,
} from '../components/ui/dialog';
import { useToast } from '../components/ui/toaster';
import { useColorModeValue } from '../components/ui/color-mode';
import { Alert } from '../components/ui/alert';
import { PlusCircle, FileEdit } from 'lucide-react';
import { partsApi, usersApi, requestsApi } from '../services/api';
import { User } from '../types';
import { Select } from '../components/ui';

interface CreateRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateRequestModal: React.FC<CreateRequestModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [partNames, setPartNames] = useState<string[]>([]);
  const [selectedPartName, setSelectedPartName] = useState('');
  const [availableNumbers, setAvailableNumbers] = useState<string[]>([]);
  const [selectedPartNumber, setSelectedPartNumber] = useState('');
  const [inspectors, setInspectors] = useState<User[]>([]);
  const [selectedInspectorId, setSelectedInspectorId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [moduleType, setModuleType] = useState<'HEAT_TREATMENT' | 'LINE_INSPECTION'>('HEAT_TREATMENT');
  const [lineId, setLineId] = useState('Line-01');
  const [shift, setShift] = useState('Shift-A');

  const [isLoadingMasterData, setIsLoadingMasterData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const toast = useToast();
  const todayStr = new Date().toISOString().split('T')[0];

  const modalBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('industrial.200', 'gray.700');
  const infoBg = useColorModeValue('industrial.50', 'gray.700');
  const labelColor = useColorModeValue('industrial.700', 'gray.300');

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
      // Reset form states
      setSelectedPartName('');
      setSelectedPartNumber('');
      setAvailableNumbers([]);
      setSelectedInspectorId('');
      setRemarks('');
      setModuleType('HEAT_TREATMENT');
      setLineId('Line-01');
      setShift('Shift-A');
      setHasAttemptedSubmit(false);
    }
  }, [isOpen]);

  const loadInitialData = async () => {
    setIsLoadingMasterData(true);
    try {
      const [names, inspectorList] = await Promise.all([
        partsApi.getPartNames(),
        usersApi.getInspectors(),
      ]);
      setPartNames(names);
      const activeOnly = inspectorList.filter((u: any) => u.isActive !== false);
      setInspectors(activeOnly);
    } catch (err: any) {
      toast({
        title: 'Error loading master data',
        description:
          err.response?.data?.message || 'Could not fetch part names or inspector list.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setIsLoadingMasterData(false);
    }
  };

  const handlePartNameChange = async (name: string) => {
    setSelectedPartName(name);
    setSelectedPartNumber('');
    setAvailableNumbers([]);

    if (!name) return;

    try {
      const numbers = await partsApi.getPartNumbers(name);
      setAvailableNumbers(numbers);
    } catch (err: any) {
      toast({
        title: 'Error loading part numbers',
        description: err.response?.data?.message || 'Could not fetch part numbers.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const isPartNameInvalid = hasAttemptedSubmit && !selectedPartName;
  const isPartNumberInvalid = hasAttemptedSubmit && !selectedPartNumber;

  const handleSaveDraft = async () => {
    setHasAttemptedSubmit(true);
    if (!selectedPartName || !selectedPartNumber) {
      toast({
        title: 'Missing Required Fields',
        description: 'Please select both Part Name and Part Number.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await requestsApi.createRequest({
        partName: selectedPartName,
        partNumber: selectedPartNumber,
        assignedInspectorId: selectedInspectorId || undefined,
        remarks: remarks.trim() || undefined,
        moduleType,
        moduleMetadata: moduleType === 'LINE_INSPECTION' ? { lineId, shift } : undefined,
      });

      toast({
        title: 'Draft Request Saved',
        description: 'Inspection request saved as Draft successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      toast({
        title: 'Failed to Save Draft',
        description: err.response?.data?.message || 'Server error occurred.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAndAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);

    if (!selectedPartName || !selectedPartNumber) {
      toast({
        title: 'Missing Required Fields',
        description: 'Please select both Part Name and Part Number.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!selectedInspectorId) {
      toast({
        title: 'Inspector Assignment Required',
        description:
          'Please select a Quality Inspector to assign this request, or click "Save as Draft".',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await requestsApi.createRequest({
        partName: selectedPartName,
        partNumber: selectedPartNumber,
        assignedInspectorId: selectedInspectorId,
        remarks: remarks.trim() || undefined,
        moduleType,
        moduleMetadata: moduleType === 'LINE_INSPECTION' ? { lineId, shift } : undefined,
      });

      toast({
        title: 'Inspection Request Created',
        description: 'Request submitted and assigned to Quality Inspector successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      toast({
        title: 'Failed to Create Request',
        description: err.response?.data?.message || 'Server error occurred.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogRoot
      open={isOpen}
      onOpenChange={(e) => {
        if (!e.open) onClose();
      }}
      placement="center"
    >
      <DialogContent as="form" onSubmit={handleCreateAndAssign} mx={4} bg={modalBg} borderColor={borderColor}>
        <DialogHeader
          borderBottomWidth="1px"
          borderColor={borderColor}
        >
          <DialogTitle fontSize="md" fontWeight="800">
            Create Inspection Request
          </DialogTitle>
        </DialogHeader>
        <DialogCloseTrigger disabled={isSubmitting} />

        <DialogBody py={5} overflow="visible">
          <VStack gap={4} align="stretch">
            {/* Module Type Selector */}
            <Field.Root required>
              <Field.Label fontSize="xs" fontWeight="700" color={labelColor}>
                INSPECTION MODULE
              </Field.Label>
              <Select
                value={moduleType}
                onChange={(val) => setModuleType(val as any)}
                options={[
                  {
                    value: 'HEAT_TREATMENT',
                    label: 'Heat Treatment Inspection (Metallurgical BHN / YS / UTS)',
                    badge: 'Metallurgy',
                    badgeColorScheme: 'orange',
                  },
                  {
                    value: 'LINE_INSPECTION',
                    label: 'Line Assembly Inspection (Torque, Visual, Deviation)',
                    badge: 'Line QC',
                    badgeColorScheme: 'blue',
                  },
                ]}
              />
            </Field.Root>

            {/* Line Inspection Context Fields */}
            {moduleType === 'LINE_INSPECTION' && (
              <HStack gap={4}>
                <Field.Root flex={1} required>
                  <Field.Label fontSize="xs" fontWeight="700" color={labelColor}>
                    LINE NO.
                  </Field.Label>
                  <Input
                    size="sm"
                    value={lineId}
                    onChange={(e) => setLineId(e.target.value)}
                    placeholder="e.g. Line-01, Line-04"
                  />
                </Field.Root>
                <Field.Root flex={1} required>
                  <Field.Label fontSize="xs" fontWeight="700" color={labelColor}>
                    SHIFT
                  </Field.Label>
                  <Select
                    size="sm"
                    value={shift}
                    onChange={(val) => setShift(val)}
                    options={[
                      { value: 'Shift-A', label: 'Shift A (Morning)' },
                      { value: 'Shift-B', label: 'Shift B (Evening)' },
                      { value: 'Shift-C', label: 'Shift C (Night)' },
                    ]}
                  />
                </Field.Root>
              </HStack>
            )}

            {/* System Info */}
            <HStack justify="space-between" bg={infoBg} p={3} borderRadius="md" borderWidth="1px" borderColor={borderColor}>
              <VStack align="start" gap={0}>
                <Text fontSize="2xs" fontWeight="700" color="gray.500">
                  REQUEST NUMBER
                </Text>
                <Text fontSize="xs" fontWeight="700" color="brand.600">
                  System-Generated on Submission
                </Text>
              </VStack>
              <VStack align="end" gap={0}>
                <Text fontSize="2xs" fontWeight="700" color="gray.500">
                  DATE
                </Text>
                <Text fontSize="xs" fontWeight="600">
                  {todayStr}
                </Text>
              </VStack>
            </HStack>

            {/* Searchable Part Name Autocomplete */}
            <Select
              id="partName"
              label="PART NAME (FROM MASTER DATA)"
              isRequired
              isInvalid={isPartNameInvalid}
              errorMessage="Please select a part name from master data."
              placeholder={
                isLoadingMasterData
                  ? 'Loading part names...'
                  : partNames.length === 0
                  ? 'No part names found'
                  : 'Select Part Name'
              }
              value={selectedPartName}
              onChange={handlePartNameChange}
              options={partNames}
              isSearchable={true}
              isDisabled={isLoadingMasterData}
            />

            {/* Auto-populated Part Number */}
            <Select
              id="partNumber"
              label="PART NUMBER (AUTO-FILTERED BY PART NAME)"
              isRequired
              isInvalid={isPartNumberInvalid}
              errorMessage="Please select a valid part number."
              placeholder={
                !selectedPartName
                  ? 'Select Part Name first'
                  : availableNumbers.length === 0
                  ? 'No part numbers found'
                  : 'Select Part Number'
              }
              value={selectedPartNumber}
              onChange={setSelectedPartNumber}
              options={availableNumbers}
              isDisabled={!selectedPartName || availableNumbers.length === 0}
            />

            {/* Quality Inspector Assignment */}
            <Field.Root>
              <Field.Label fontSize="xs" fontWeight="700" color={labelColor} mb={1.5}>
                ASSIGN QUALITY INSPECTOR
              </Field.Label>
              <Select
                placeholder="Select Active Quality Inspector"
                value={selectedInspectorId}
                onChange={setSelectedInspectorId}
                options={inspectors.map((insp) => ({
                  value: insp.id,
                  label: `${insp.fullName} (@${insp.username})`,
                  badge: 'Active Inspector',
                  badgeColorScheme: 'green',
                }))}
                isSearchable={true}
                isDisabled={isLoadingMasterData}
              />
            </Field.Root>

            {inspectors.length === 0 && !isLoadingMasterData && (
              <Alert status="warning" title="No active Quality Inspectors found.">
                You can save requests as Draft until an inspector is registered.
              </Alert>
            )}

            {/* Remarks */}
            <Field.Root>
              <Field.Label fontSize="xs" fontWeight="700" color={labelColor}>
                ENGINEER REMARKS / SPECIAL INSTRUCTIONS
              </Field.Label>
              <Textarea
                placeholder="Optional inspection notes, heat treatment parameters, customer specs..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
              />
            </Field.Root>
          </VStack>
        </DialogBody>

        <DialogFooter borderTopWidth="1px" borderColor={borderColor} gap={2} flexWrap="wrap">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveDraft}
            loading={isSubmitting}
            disabled={!selectedPartName || !selectedPartNumber}
          >
            <FileEdit size={15} />
            Save as Draft
          </Button>
          <Button
            type="submit"
            colorPalette="blue"
            size="sm"
            loading={isSubmitting}
            disabled={!selectedPartName || !selectedPartNumber || !selectedInspectorId}
          >
            <PlusCircle size={16} />
            Create & Assign Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
};

