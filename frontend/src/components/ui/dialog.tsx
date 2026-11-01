import { Dialog as ChakraDialog, Portal } from "@chakra-ui/react"
import { CloseButton } from "./close-button"
import * as React from "react"

interface DialogContentProps extends ChakraDialog.ContentProps {
  portalled?: boolean
  portalRef?: React.RefObject<HTMLElement | null>
  backdrop?: boolean
}

export const DialogContent = React.forwardRef<
  HTMLDivElement,
  DialogContentProps
>(function DialogContent(props, ref) {
  const {
    children,
    portalled = true,
    portalRef,
    backdrop = true,
    ...rest
  } = props

  return (
    <Portal disabled={!portalled} container={portalRef}>
      {backdrop && <ChakraDialog.Backdrop />}
      <ChakraDialog.Positioner>
        <ChakraDialog.Content ref={ref} {...rest} asChild={false}>
          {children}
        </ChakraDialog.Content>
      </ChakraDialog.Positioner>
    </Portal>
  )
})

export interface DialogCloseTriggerProps extends ChakraDialog.CloseTriggerProps {
  isDisabled?: boolean
}

export const DialogCloseTrigger = React.forwardRef<
  HTMLButtonElement,
  DialogCloseTriggerProps
>(function DialogCloseTrigger(props, ref) {
  const { isDisabled, disabled, ...rest } = props
  return (
    <ChakraDialog.CloseTrigger
      ref={ref}
      disabled={disabled ?? isDisabled}
      {...rest}
      asChild
    >
      <CloseButton size="sm" />
    </ChakraDialog.CloseTrigger>
  )
})

export const DialogRoot = ChakraDialog.Root
export const DialogFooter = ChakraDialog.Footer
export const DialogHeader = ChakraDialog.Header
export const DialogBody = ChakraDialog.Body
export const DialogBackdrop = ChakraDialog.Backdrop
export const DialogTitle = ChakraDialog.Title
export const DialogDescription = ChakraDialog.Description
export const DialogTrigger = ChakraDialog.Trigger
export const DialogActionTrigger = ChakraDialog.ActionTrigger

// Backward-compatibility wrappers for seamless migration from v2 Modal to v3 Dialog
export interface ModalProps extends Omit<ChakraDialog.RootProps, "size" | "motionPreset"> {
  isOpen?: boolean
  onClose?: () => void
  isCentered?: boolean
  initialFocusRef?: any
  finalFocusRef?: any
  blockScrollOnMount?: boolean
  preserveScrollBarGap?: boolean
  motionPreset?: any
  size?: any
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  open,
  onOpenChange,
  children,
  size,
  motionPreset,
  blockScrollOnMount,
  preserveScrollBarGap,
  ...rest
}) => {
  const mappedSize = size === "2xl" || size === "3xl" ? "xl" : size
  return (
    <ChakraDialog.Root
      open={open ?? isOpen}
      onOpenChange={(e) => {
        onOpenChange?.(e)
        if (!e.open && onClose) onClose()
      }}
      size={mappedSize}
      {...rest}
    >
      {children}
    </ChakraDialog.Root>
  )
}

export const ModalOverlay: React.FC<React.PropsWithChildren<any>> = () => null
export const ModalContent = DialogContent
export const ModalHeader = DialogHeader
export const ModalTitle = DialogTitle
export const ModalBody = DialogBody
export const ModalFooter = DialogFooter
export const ModalCloseButton = DialogCloseTrigger
