import { Field as ChakraField } from "@chakra-ui/react"
import * as React from "react"

export interface FieldProps extends Omit<ChakraField.RootProps, "label"> {
  label?: React.ReactNode
  helperText?: React.ReactNode
  errorText?: React.ReactNode
  optionalText?: React.ReactNode
}

const FieldComponent = React.forwardRef<HTMLDivElement, FieldProps>(
  function Field(props, ref) {
    const { label, children, helperText, errorText, optionalText, ...rest } =
      props
    return (
      <ChakraField.Root ref={ref} {...rest}>
        {label && (
          <ChakraField.Label>
            {label}
            <ChakraField.RequiredIndicator fallback={optionalText} />
          </ChakraField.Label>
        )}
        {children}
        {helperText && (
          <ChakraField.HelperText>{helperText}</ChakraField.HelperText>
        )}
        {errorText && (
          <ChakraField.ErrorText>{errorText}</ChakraField.ErrorText>
        )}
      </ChakraField.Root>
    )
  },
)

export const Field = Object.assign(FieldComponent, {
  Root: ChakraField.Root,
  Label: ChakraField.Label,
  ErrorText: ChakraField.ErrorText,
  HelperText: ChakraField.HelperText,
  RequiredIndicator: ChakraField.RequiredIndicator,
})

// Backward compatibility wrappers for Chakra v2
export const FormControl: React.FC<any> = ({ isRequired, isInvalid, children, ...rest }) => (
  <ChakraField.Root required={isRequired} invalid={isInvalid} {...rest}>
    {children}
  </ChakraField.Root>
)

export const FormLabel: React.FC<any> = ({ children, ...rest }) => (
  <ChakraField.Label {...rest}>{children}</ChakraField.Label>
)

export const FormErrorMessage: React.FC<any> = ({ children, ...rest }) => (
  <ChakraField.ErrorText {...rest}>{children}</ChakraField.ErrorText>
)

export const FormHelperText: React.FC<any> = ({ children, ...rest }) => (
  <ChakraField.HelperText {...rest}>{children}</ChakraField.HelperText>
)
