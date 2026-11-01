import React from 'react';
import {
  Field,
  Input,
  Group,
  InputAddon,
  InputProps,
} from '@chakra-ui/react';
import { useColorModeValue } from './ui/color-mode';
import { DatePicker } from './ui/date-picker';

export interface FormFieldProps extends Omit<InputProps, 'onChange'> {
  id?: string;
  label: string;
  isRequired?: boolean;
  required?: boolean;
  isInvalid?: boolean;
  invalid?: boolean;
  isDisabled?: boolean;
  disabled?: boolean;
  errorMessage?: string;
  helperText?: string;
  unit?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
  step?: string;
  min?: string | number;
  max?: string | number;
}

export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  (
    {
      id,
      label,
      isRequired = false,
      required,
      isInvalid = false,
      invalid,
      isDisabled = false,
      disabled,
      errorMessage,
      helperText,
      unit,
      value,
      onChange,
      type = 'text',
      placeholder,
      ...rest
    },
    ref,
  ) => {
    const isFieldRequired = required ?? isRequired;
    const isFieldInvalid = invalid ?? isInvalid;
    const isFieldDisabled = disabled ?? isDisabled;

    const inputBg = useColorModeValue('white', 'gray.900');
    const inputBorder = useColorModeValue(
      isFieldInvalid ? 'red.500' : 'industrial.300',
      isFieldInvalid ? 'red.400' : 'gray.600'
    );
    const inputTextColor = useColorModeValue('industrial.900', 'gray.100');
    const labelColor = useColorModeValue('industrial.700', 'gray.300');
    const addonBg = useColorModeValue('industrial.100', 'gray.700');
    const addonTextColor = useColorModeValue('industrial.700', 'gray.200');

    if (type === 'date') {
      return (
        <DatePicker
          id={id}
          label={label}
          value={String(value || '')}
          onChange={(dateStr) => {
            onChange?.({ target: { value: dateStr } } as any);
          }}
          isRequired={isFieldRequired}
          isInvalid={isFieldInvalid}
          errorMessage={errorMessage}
          helperText={helperText}
          isDisabled={isFieldDisabled}
          placeholder={placeholder || 'Select date (YYYY-MM-DD)'}
        />
      );
    }

    const inputElement = (
      <Input
        ref={ref}
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={isFieldDisabled}
        bg={inputBg}
        borderColor={inputBorder}
        color={inputTextColor}
        size="sm"
        borderRadius="md"
        {...rest}
      />
    );

    return (
      <Field.Root
        id={id}
        required={isFieldRequired}
        invalid={isFieldInvalid}
        disabled={isFieldDisabled}
      >
        <Field.Label fontSize="xs" fontWeight="700" color={labelColor} mb={1.5}>
          {label}
        </Field.Label>
        {unit ? (
          <Group attached width="full">
            {inputElement}
            <InputAddon
              fontSize="xs"
              fontWeight="700"
              bg={addonBg}
              color={addonTextColor}
              borderColor={inputBorder}
            >
              {unit}
            </InputAddon>
          </Group>
        ) : (
          inputElement
        )}
        {helperText && !isFieldInvalid && (
          <Field.HelperText fontSize="2xs" color="gray.400">
            {helperText}
          </Field.HelperText>
        )}
        {isFieldInvalid && errorMessage && (
          <Field.ErrorText fontSize="2xs">
            {errorMessage}
          </Field.ErrorText>
        )}
      </Field.Root>
    );
  },
);

FormField.displayName = 'FormField';
