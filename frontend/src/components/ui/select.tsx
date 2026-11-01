import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Box,
  Flex,
  HStack,
  Text,
  Button,
  Input,
  Field,
  Badge,
  Icon,
} from '@chakra-ui/react';
import { useColorModeValue } from './color-mode';
import { ChevronDown, Check, Search } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  badge?: string;
  badgeColorScheme?: string;
}

export interface SelectProps {
  id?: string;
  label?: string;
  value?: string;
  onChange: (value: string) => void;
  options: Array<SelectOption | string>;
  placeholder?: string;
  isRequired?: boolean;
  required?: boolean;
  isInvalid?: boolean;
  invalid?: boolean;
  errorMessage?: string;
  helperText?: string;
  isDisabled?: boolean;
  disabled?: boolean;
  isSearchable?: boolean;
  size?: 'xs' | 'sm' | 'md';
  w?: string | object;
}

export const Select: React.FC<SelectProps> = ({
  id,
  label,
  value = '',
  onChange,
  options,
  placeholder = 'Select an option',
  isRequired = false,
  required,
  isInvalid = false,
  invalid,
  errorMessage,
  helperText,
  isDisabled = false,
  disabled,
  isSearchable = false,
  size = 'sm',
  w = 'full',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [openUpwards, setOpenUpwards] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isFieldRequired = required ?? isRequired;
  const isFieldInvalid = invalid ?? isInvalid;
  const isFieldDisabled = disabled ?? isDisabled;

  const btnBg = useColorModeValue('white', 'gray.900');
  const btnBorder = useColorModeValue(
    isFieldInvalid ? 'red.500' : 'industrial.300',
    isFieldInvalid ? 'red.400' : 'gray.600'
  );
  const btnHoverBorder = useColorModeValue(
    isFieldInvalid ? 'red.500' : 'industrial.400',
    isFieldInvalid ? 'red.400' : 'gray.500'
  );
  const btnTextColor = useColorModeValue('industrial.900', 'gray.100');
  const labelColor = useColorModeValue('industrial.700', 'gray.300');
  const menuListBg = useColorModeValue('white', 'gray.850');
  const menuListBorder = useColorModeValue('industrial.200', 'gray.700');
  const dividerBorder = useColorModeValue('gray.100', 'gray.700');
  const searchInputBg = useColorModeValue('gray.50', 'gray.800');
  const itemTextColor = useColorModeValue('industrial.800', 'gray.200');
  const itemSelectedBg = useColorModeValue('blue.50', 'rgba(37, 99, 235, 0.25)');
  const itemSelectedText = useColorModeValue('brand.700', 'blue.200');
  const itemHoverBg = useColorModeValue('gray.100', 'gray.750');
  const itemSelectedHoverBg = useColorModeValue('blue.100', 'rgba(37, 99, 235, 0.35)');

  // Normalize options to SelectOption[]
  const normalizedOptions: SelectOption[] = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === 'string') {
        return { value: opt, label: opt };
      }
      return opt;
    });
  }, [options]);

  // Filter options based on search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return normalizedOptions;
    const term = searchTerm.toLowerCase();
    return normalizedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(term) ||
        opt.value.toLowerCase().includes(term)
    );
  }, [normalizedOptions, searchTerm]);

  // Selected option
  const selectedOption = useMemo(() => {
    return normalizedOptions.find((opt) => opt.value === value);
  }, [normalizedOptions, value]);

  // Check positioning (upwards vs downwards) when opening
  const handleToggle = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (isFieldDisabled) return;

    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      // If less than 240px below and more space above, open upwards
      if (spaceBelow < 240 && spaceAbove > spaceBelow) {
        setOpenUpwards(true);
      } else {
        setOpenUpwards(false);
      }
    }

    setIsOpen((prev) => !prev);
    if (isOpen) setSearchTerm('');
  };

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && isSearchable) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isSearchable]);

  // Click outside and escape key handling
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearchTerm('');
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('touchstart', handleClickOutside, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('touchstart', handleClickOutside, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectOption = (optValue: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(optValue);
    setIsOpen(false);
    setSearchTerm('');
    buttonRef.current?.focus();
  };

  return (
    <Field.Root
      id={id}
      required={isFieldRequired}
      invalid={isFieldInvalid}
      disabled={isFieldDisabled}
      w={w}
    >
      {label && (
        <Field.Label fontSize="xs" fontWeight="700" color={labelColor} mb={1.5}>
          {label}
        </Field.Label>
      )}

      <Box position="relative" w="full" ref={containerRef}>
        <Button
          ref={buttonRef}
          type="button"
          size={size}
          w="full"
          textAlign="left"
          fontWeight="normal"
          bg={btnBg}
          border="1px solid"
          borderColor={btnBorder}
          borderRadius="md"
          px={3}
          h={size === 'xs' ? '28px' : size === 'sm' ? '32px' : '40px'}
          disabled={isFieldDisabled}
          _hover={{
            borderColor: btnHoverBorder,
          }}
          _focus={{
            borderColor: isFieldInvalid ? 'red.500' : 'brand.500',
            boxShadow: '0 0 0 1px var(--chakra-colors-brand-500, #2563EB)',
          }}
          onClick={handleToggle}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <Flex justify="space-between" align="center" w="full">
            <HStack gap={2} overflow="hidden" flex={1}>
              {selectedOption ? (
                <>
                  <Text
                    fontSize="xs"
                    fontWeight="500"
                    color={btnTextColor}
                    truncate
                  >
                    {selectedOption.label}
                  </Text>
                  {selectedOption.badge && (
                    <Badge
                      fontSize="2xs"
                      colorPalette={selectedOption.badgeColorScheme || 'gray'}
                      borderRadius="sm"
                      px={1.5}
                      py={0.5}
                    >
                      {selectedOption.badge}
                    </Badge>
                  )}
                </>
              ) : (
                <Text fontSize="xs" color="gray.400" truncate>
                  {placeholder}
                </Text>
              )}
            </HStack>
            <Icon
              as={ChevronDown}
              boxSize={4}
              color="gray.400"
              transform={isOpen ? 'rotate(180deg)' : undefined}
              transition="transform 0.2s ease"
              flexShrink={0}
              ml={2}
            />
          </Flex>
        </Button>

        {/* Dropdown Menu Container with Emil Kowalski snappy scale-in */}
        {isOpen && (
          <Box
            position="absolute"
            top={openUpwards ? undefined : 'calc(100% + 4px)'}
            bottom={openUpwards ? 'calc(100% + 4px)' : undefined}
            left={0}
            right={0}
            w="full"
            bg={menuListBg}
            border="1px solid"
            borderColor={menuListBorder}
            boxShadow="xl"
            borderRadius="md"
            p={1}
            maxH="260px"
            overflowY="auto"
            zIndex={2500}
            role="listbox"
            animation="emilScaleIn 160ms cubic-bezier(0.16, 1, 0.3, 1)"
            transformOrigin={openUpwards ? 'bottom center' : 'top center'}
          >
            {isSearchable && (
              <Box p={2} pb={1} borderBottom="1px solid" borderColor={dividerBorder} mb={1}>
                <Box position="relative">
                  <Input
                    ref={searchInputRef}
                    size="xs"
                    placeholder="Search options..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    borderRadius="md"
                    bg={searchInputBg}
                    borderColor={btnBorder}
                    color={btnTextColor}
                    pl={7}
                  />
                  <Flex
                    position="absolute"
                    left={2}
                    top="50%"
                    transform="translateY(-50%)"
                    pointerEvents="none"
                  >
                    <Icon as={Search} boxSize={3.5} color="gray.400" />
                  </Flex>
                </Box>
              </Box>
            )}

            {filteredOptions.length === 0 ? (
              <Box py={3} px={3} textAlign="center">
                <Text fontSize="xs" color="gray.400">
                  No matching options found
                </Text>
              </Box>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <Box
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={(e) => handleSelectOption(opt.value, e)}
                    bg={isSelected ? itemSelectedBg : 'transparent'}
                    _hover={{
                      bg: isSelected ? itemSelectedHoverBg : itemHoverBg,
                    }}
                    borderRadius="sm"
                    px={3}
                    py={2}
                    cursor="pointer"
                    transition="background-color 100ms ease-out, transform 80ms cubic-bezier(0.23, 1, 0.32, 1)"
                    _active={{ transform: 'scale(0.99)' }}
                  >
                    <Flex justify="space-between" align="center" w="full">
                      <HStack gap={2} overflow="hidden">
                        <Text
                          fontSize="xs"
                          fontWeight={isSelected ? '700' : '500'}
                          color={isSelected ? itemSelectedText : itemTextColor}
                          truncate
                        >
                          {opt.label}
                        </Text>
                        {opt.badge && (
                          <Badge
                            fontSize="2xs"
                            colorPalette={opt.badgeColorScheme || 'gray'}
                            borderRadius="sm"
                            px={1.5}
                            py={0.5}
                          >
                            {opt.badge}
                          </Badge>
                        )}
                      </HStack>
                      {isSelected && (
                        <Icon as={Check} boxSize={3.5} color="brand.500" ml={2} />
                      )}
                    </Flex>
                  </Box>
                );
              })
            )}
          </Box>
        )}
      </Box>

      {isFieldInvalid && errorMessage && (
        <Field.ErrorText fontSize="2xs" mt={1}>
          {errorMessage}
        </Field.ErrorText>
      )}
      {!isFieldInvalid && helperText && (
        <Field.HelperText fontSize="2xs" mt={1} color="gray.500">
          {helperText}
        </Field.HelperText>
      )}
    </Field.Root>
  );
};

export default Select;
