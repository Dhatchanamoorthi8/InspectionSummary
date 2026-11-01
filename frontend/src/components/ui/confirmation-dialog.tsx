import React, { useRef } from 'react';
import { Button, Text } from '@chakra-ui/react';
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogCloseTrigger,
} from './dialog';
import { useColorModeValue } from './color-mode';

export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColorScheme?: 'red' | 'brand' | 'orange' | 'green';
  isDestructive?: boolean;
  isLoading?: boolean;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmColorScheme = 'brand',
  isDestructive = false,
  isLoading = false,
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null);

  const dialogBg = useColorModeValue('white', 'gray.800');
  const dialogBorder = useColorModeValue('industrial.200', 'gray.700');
  const titleColor = useColorModeValue('industrial.900', 'white');
  const messageColor = useColorModeValue('gray.600', 'gray.300');

  const displayText = message || description || '';
  const effectiveColorScheme = isDestructive ? 'red' : confirmColorScheme;

  return (
    <DialogRoot
      open={isOpen}
      onOpenChange={(e) => {
        if (!e.open) onClose();
      }}
      placement="center"
    >
      <DialogContent
        mx={4}
        bg={dialogBg}
        borderWidth="1px"
        borderColor={dialogBorder}
        borderRadius="lg"
      >
        <DialogHeader>
          <DialogTitle fontSize="md" fontWeight="700" color={titleColor}>
            {title}
          </DialogTitle>
        </DialogHeader>
        <DialogCloseTrigger disabled={isLoading} />
        <DialogBody>
          <Text fontSize="sm" color={messageColor}>
            {displayText}
          </Text>
        </DialogBody>
        <DialogFooter gap={2}>
          <Button
            ref={cancelRef}
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            colorPalette={effectiveColorScheme}
            size="sm"
            onClick={onConfirm}
            loading={isLoading}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
};

export default ConfirmationDialog;
