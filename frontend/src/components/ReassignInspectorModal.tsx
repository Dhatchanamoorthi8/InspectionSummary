import React, { useState, useEffect } from 'react';
import {
  VStack,
  Box,
  Text,
  Field,
  Textarea,
  Button,
} from '@chakra-ui/react';
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogCloseTrigger,
  DialogBody,
  DialogFooter,
} from './ui/dialog';
import { useColorModeValue } from './ui/color-mode';
import { User } from '../types';
import { Select } from './ui/select';

interface ReassignInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestNumber?: string;
  partName?: string;
  currentInspectorName?: string | null;
  inspectors: User[];
  onConfirm: (newInspectorId: string, reason: string) => Promise<void> | void;
  isLoading?: boolean;
}

export const ReassignInspectorModal: React.FC<ReassignInspectorModalProps> = ({
  isOpen,
  onClose,
  requestNumber,
  partName,
  currentInspectorName,
  inspectors,
  onConfirm,
  isLoading = false,
}) => {
  const [selectedInspectorId, setSelectedInspectorId] = useState('');
  const [reason, setReason] = useState('');
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedInspectorId('');
      setReason('');
      setHasAttemptedSubmit(false);
    }
  }, [isOpen]);

  const isInspectorInvalid = hasAttemptedSubmit && !selectedInspectorId;
  const isReasonInvalid = hasAttemptedSubmit && !reason.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);
    if (!selectedInspectorId) return;

    await onConfirm(selectedInspectorId, reason.trim());
  };

  const activeInspectors = inspectors.filter((i) => i.isActive !== false);

  const modalBg = useColorModeValue('white', 'gray.800');
  const modalBorder = useColorModeValue('industrial.200', 'gray.700');
  const headerColor = useColorModeValue('industrial.900', 'white');
  const summaryBg = useColorModeValue('industrial.50', 'gray.700');

  return (
    <DialogRoot
      open={isOpen}
      onOpenChange={(e) => {
        if (!e.open) onClose();
      }}
      placement="center"
    >
      <DialogContent
        as="form"
        onSubmit={handleSubmit}
        mx={4}
        bg={modalBg}
        borderWidth="1px"
        borderColor={modalBorder}
      >
        <DialogHeader borderBottomWidth="1px" borderColor={modalBorder}>
          <DialogTitle fontSize="md" fontWeight="800" color={headerColor}>
            Reassign Quality Inspector
          </DialogTitle>
        </DialogHeader>
        <DialogCloseTrigger disabled={isLoading} />
        <DialogBody py={4} overflow="visible">
          <VStack gap={4} align="stretch">
            {(requestNumber || partName) && (
              <Box bg={summaryBg} p={3} borderRadius="md" borderWidth="1px" borderColor={modalBorder}>
                <Text fontSize="2xs" fontWeight="700" color="gray.500" textTransform="uppercase">
                  Request Summary
                </Text>
                <Text fontSize="sm" fontWeight="700" color="brand.600">
                  {requestNumber} {partName ? `— ${partName}` : ''}
                </Text>
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Current Inspector: {currentInspectorName || 'Unassigned'}
                </Text>
              </Box>
            )}

            <Select
              id="newInspector"
              label="NEW QUALITY INSPECTOR"
              isRequired
              isInvalid={isInspectorInvalid}
              errorMessage="Please select an active quality inspector."
              placeholder="Select Active Quality Inspector"
              value={selectedInspectorId}
              onChange={setSelectedInspectorId}
              options={activeInspectors.map((insp) => ({
                value: insp.id,
                label: `${insp.fullName} (@${insp.username})`,
                badge: 'Active Inspector',
                badgeColorScheme: 'green',
              }))}
              isSearchable={true}
            />

            <Field.Root invalid={isReasonInvalid}>
              <Field.Label fontSize="xs" fontWeight="700">
                REASSIGNMENT REASON (AUDITED)
              </Field.Label>
              <Textarea
                placeholder="e.g. Shift handover, inspector unavailable, priority reallocation..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
              {isReasonInvalid && (
                <Field.ErrorText fontSize="2xs">
                  Reassignment reason is helpful for audit tracking.
                </Field.ErrorText>
              )}
            </Field.Root>
          </VStack>
        </DialogBody>
        <DialogFooter gap={2}>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            colorPalette="blue"
            size="sm"
            loading={isLoading}
            disabled={!selectedInspectorId}
          >
            Confirm Reassignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
};
