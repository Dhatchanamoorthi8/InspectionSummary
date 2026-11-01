import type { ButtonProps as ChakraButtonProps } from "@chakra-ui/react"
import {
  AbsoluteCenter,
  Button as ChakraButton,
  HStack,
  Span,
  Spinner,
} from "@chakra-ui/react"
import * as React from "react"

interface ButtonLoadingProps {
  loading?: boolean
  loadingText?: React.ReactNode
}

export interface ButtonProps extends ChakraButtonProps, ButtonLoadingProps {
  isLoading?: boolean
  isDisabled?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  colorScheme?: string
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(props, ref) {
    const {
      loading,
      isLoading,
      disabled,
      isDisabled,
      loadingText,
      children,
      leftIcon,
      rightIcon,
      colorScheme,
      colorPalette,
      ...rest
    } = props

    const isL = loading ?? isLoading
    const isD = disabled ?? isDisabled
    const palette = colorPalette ?? (colorScheme === 'brand' ? 'blue' : colorScheme)

    const content = (
      <>
        {leftIcon && <span style={{ display: 'inline-flex', marginRight: '6px' }}>{leftIcon}</span>}
        {children}
        {rightIcon && <span style={{ display: 'inline-flex', marginLeft: '6px' }}>{rightIcon}</span>}
      </>
    )

    return (
      <ChakraButton
        disabled={isL || isD}
        colorPalette={palette}
        ref={ref}
        {...rest}
      >
        {isL && !loadingText ? (
          <>
            <AbsoluteCenter display="inline-flex">
              <Spinner size="inherit" color="inherit" />
            </AbsoluteCenter>
            <Span opacity={0}>{content}</Span>
          </>
        ) : isL && loadingText ? (
          <>
            <Spinner size="inherit" color="inherit" />
            {loadingText}
          </>
        ) : (
          content
        )}
      </ChakraButton>
    )
  },
)
