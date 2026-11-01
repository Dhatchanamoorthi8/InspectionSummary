import { Switch as ChakraSwitch } from "@chakra-ui/react"
import * as React from "react"

export interface SwitchProps extends Omit<ChakraSwitch.RootProps, "onChange"> {
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>
  rootRef?: any
  trackLabel?: { on: React.ReactNode; off: React.ReactNode }
  thumbLabel?: { on: React.ReactNode; off: React.ReactNode }
  isChecked?: boolean
  checked?: boolean
  isDisabled?: boolean
  disabled?: boolean
  colorScheme?: string
  colorPalette?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  function Switch(props, ref) {
    const {
      inputProps,
      children,
      rootRef,
      trackLabel,
      thumbLabel,
      isChecked,
      checked,
      isDisabled,
      disabled,
      colorScheme,
      colorPalette,
      onChange,
      ...rest
    } = props

    const isCheckedValue = checked ?? isChecked
    const isDisabledValue = disabled ?? isDisabled
    const palette = colorPalette ?? (colorScheme === 'brand' ? 'blue' : colorScheme)

    return (
      <ChakraSwitch.Root
        ref={rootRef}
        checked={isCheckedValue}
        disabled={isDisabledValue}
        colorPalette={palette}
        {...rest}
      >
        <ChakraSwitch.HiddenInput
          ref={ref}
          onChange={onChange}
          {...inputProps}
        />
        <ChakraSwitch.Control>
          <ChakraSwitch.Thumb>
            {thumbLabel && (
              <ChakraSwitch.ThumbIndicator fallback={thumbLabel?.off}>
                {thumbLabel?.on}
              </ChakraSwitch.ThumbIndicator>
            )}
          </ChakraSwitch.Thumb>
          {trackLabel && (
            <ChakraSwitch.Indicator fallback={trackLabel.off}>
              {trackLabel.on}
            </ChakraSwitch.Indicator>
          )}
        </ChakraSwitch.Control>
        {children != null && (
          <ChakraSwitch.Label>{children}</ChakraSwitch.Label>
        )}
      </ChakraSwitch.Root>
    )
  },
)
