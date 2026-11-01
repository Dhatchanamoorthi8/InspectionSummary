import { Tooltip as ChakraTooltip, Portal } from "@chakra-ui/react"
import * as React from "react"

export interface TooltipProps extends ChakraTooltip.RootProps {
  showArrow?: boolean
  hasArrow?: boolean
  portalled?: boolean
  portalRef?: React.RefObject<HTMLElement | null>
  content?: React.ReactNode
  label?: React.ReactNode
  contentProps?: ChakraTooltip.ContentProps
  disabled?: boolean
  isDisabled?: boolean
  placement?: any
  fontSize?: any
}

export const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(
  function Tooltip(props, ref) {
    const {
      showArrow,
      hasArrow,
      children,
      disabled,
      isDisabled,
      portalled = true,
      content,
      label,
      contentProps,
      portalRef,
      placement,
      fontSize,
      ...rest
    } = props

    const isTooltipDisabled = disabled ?? isDisabled
    if (isTooltipDisabled) return <>{children}</>

    const tooltipContent = content ?? label
    const arrow = showArrow ?? hasArrow

    return (
      <ChakraTooltip.Root
        positioning={placement ? { placement } : rest.positioning}
        {...rest}
      >
        <ChakraTooltip.Trigger asChild>{children}</ChakraTooltip.Trigger>
        <Portal disabled={!portalled} container={portalRef}>
          <ChakraTooltip.Positioner>
            <ChakraTooltip.Content ref={ref} fontSize={fontSize} {...contentProps}>
              {arrow && (
                <ChakraTooltip.Arrow>
                  <ChakraTooltip.ArrowTip />
                </ChakraTooltip.Arrow>
              )}
              {tooltipContent}
            </ChakraTooltip.Content>
          </ChakraTooltip.Positioner>
        </Portal>
      </ChakraTooltip.Root>
    )
  },
)

