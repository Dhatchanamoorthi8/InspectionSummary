import { Checkbox as ChakraCheckbox } from "@chakra-ui/react"
import * as React from "react"

export interface CheckboxProps extends Omit<ChakraCheckbox.RootProps, "checked"> {
  icon?: React.ReactNode
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>
  rootRef?: any
  isChecked?: boolean
  checked?: boolean
  isDisabled?: boolean
  disabled?: boolean
  colorScheme?: string
  onChange?: (e: any) => void
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox(props, ref) {
    const {
      icon,
      children,
      inputProps,
      rootRef,
      isChecked,
      checked,
      isDisabled,
      disabled,
      colorScheme,
      colorPalette,
      onChange,
      onCheckedChange,
      ...rest
    } = props

    const isCh = checked ?? isChecked
    const isDis = disabled ?? isDisabled
    const palette = colorPalette ?? (colorScheme === 'brand' ? 'blue' : colorScheme)

    return (
      <ChakraCheckbox.Root
        ref={rootRef}
        checked={isCh}
        disabled={isDis}
        colorPalette={palette}
        onCheckedChange={(details) => {
          onCheckedChange?.(details)
          if (onChange) {
            onChange({ target: { checked: !!details.checked } } as any)
          }
        }}
        {...rest}
      >
        <ChakraCheckbox.HiddenInput ref={ref} {...inputProps} />
        <ChakraCheckbox.Control>
          {icon || <ChakraCheckbox.Indicator />}
        </ChakraCheckbox.Control>
        {children != null && (
          <ChakraCheckbox.Label>{children}</ChakraCheckbox.Label>
        )}
      </ChakraCheckbox.Root>
    )
  },
)
