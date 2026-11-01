import { Drawer as ChakraDrawer, Portal } from "@chakra-ui/react"
import { CloseButton } from "./close-button"
import * as React from "react"

interface DrawerContentProps extends ChakraDrawer.ContentProps {
  portalled?: boolean
  portalRef?: React.RefObject<HTMLElement | null>
  offset?: ChakraDrawer.ContentProps["padding"]
  backdrop?: boolean
}

export const DrawerContent = React.forwardRef<
  HTMLDivElement,
  DrawerContentProps
>(function DrawerContent(props, ref) {
  const {
    children,
    portalled = true,
    portalRef,
    offset,
    backdrop = true,
    ...rest
  } = props
  return (
    <Portal disabled={!portalled} container={portalRef}>
      {backdrop && <ChakraDrawer.Backdrop />}
      <ChakraDrawer.Positioner padding={offset}>
        <ChakraDrawer.Content ref={ref} {...rest} asChild={false}>
          {children}
        </ChakraDrawer.Content>
      </ChakraDrawer.Positioner>
    </Portal>
  )
})

export const DrawerCloseTrigger = React.forwardRef<
  HTMLButtonElement,
  ChakraDrawer.CloseTriggerProps
>(function DrawerCloseTrigger(props, ref) {
  return (
    <ChakraDrawer.CloseTrigger
      position="absolute"
      top="2"
      insetEnd="2"
      {...props}
      asChild
    >
      <CloseButton size="sm" ref={ref} />
    </ChakraDrawer.CloseTrigger>
  )
})

export const DrawerTrigger = ChakraDrawer.Trigger
export const DrawerRoot = ChakraDrawer.Root
export const DrawerFooter = ChakraDrawer.Footer
export const DrawerHeader = ChakraDrawer.Header
export const DrawerBody = ChakraDrawer.Body
export const DrawerBackdrop = ChakraDrawer.Backdrop
export const DrawerDescription = ChakraDrawer.Description
export const DrawerTitle = ChakraDrawer.Title
export const DrawerActionTrigger = ChakraDrawer.ActionTrigger

export interface DrawerProps extends Omit<ChakraDrawer.RootProps, "placement"> {
  isOpen?: boolean
  onClose?: () => void
  placement?: "left" | "right" | "top" | "bottom" | "start" | "end"
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  open,
  onOpenChange,
  children,
  placement = "start",
  ...rest
}) => {
  const resolvedPlacement =
    placement === "left"
      ? "start"
      : placement === "right"
        ? "end"
        : placement

  return (
    <ChakraDrawer.Root
      open={open ?? isOpen}
      onOpenChange={(e) => {
        onOpenChange?.(e)
        if (!e.open && onClose) onClose()
      }}
      placement={resolvedPlacement as any}
      {...rest}
    >
      {children}
    </ChakraDrawer.Root>
  )
}

export const DrawerOverlay: React.FC<React.PropsWithChildren<any>> = () => null
export const DrawerCloseButton = DrawerCloseTrigger

