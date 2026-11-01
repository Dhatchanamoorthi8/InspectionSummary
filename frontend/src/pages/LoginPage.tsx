import React, { useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Input,
  VStack,
  Text,
  Heading,
  Icon,
  IconButton,
  Field,
} from '@chakra-ui/react';
import { Divider } from '../components/ui';
import { useToast } from '../components/ui/toaster';
import { useColorMode, useColorModeValue } from '../components/ui/color-mode';
import { Tooltip } from '../components/ui/tooltip';
import { Flame, Eye, EyeOff, LogIn, UserCheck, Shield, Sun, Moon } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { colorMode, toggleColorMode } = useColorMode();
  const isDark = colorMode === 'dark';

  const pageBg = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const cardBorder = useColorModeValue('gray.200', 'gray.700');
  const headingColor = useColorModeValue('industrial.900', 'white');
  const labelColor = useColorModeValue('industrial.700', 'gray.300');

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setHasAttemptedSubmit(true);
    if (!username.trim() || !password.trim()) {
      toast({
        title: 'Missing credentials',
        description: 'Please enter both username and password.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await login(username.trim(), password.trim());
      toast({
        title: 'Authentication successful',
        description: `Welcome back, ${user.fullName || user.username}!`,
        status: 'success',
        duration: 2500,
        isClosable: true,
      });

      const from = (location.state as any)?.from?.pathname;
      if (from) {
        navigate(from, { replace: true });
      } else if (user.role === 'PRODUCTION_ENGINEER') {
        navigate('/production/dashboard', { replace: true });
      } else {
        navigate('/inspector/dashboard', { replace: true });
      }
    } catch (err: any) {
      toast({
        title: 'Authentication failed',
        description:
          err.response?.data?.message || 'Invalid username or password. Please verify.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickPrefill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <Flex minH="100vh" align="center" justify="center" bg={pageBg} px={4} py={12} position="relative">
      {/* Top Right Color Mode Toggle */}
      <Box position="absolute" top={4} right={4}>
        <Tooltip label={isDark ? 'Switch to light mode' : 'Switch to dark mode'} hasArrow>
          <IconButton
            aria-label="Toggle color mode"
            onClick={toggleColorMode}
            variant="ghost"
            size="sm"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </IconButton>
        </Tooltip>
      </Box>

      <Box
        w="full"
        maxW="440px"
        bg={cardBg}
        p={{ base: 6, md: 8 }}
        borderRadius="xl"
        boxShadow="2xl"
        borderWidth="1px"
        borderColor={cardBorder}
      >
        {/* Header */}
        <VStack gap={2} align="center" mb={6}>
          <Flex
            w={12}
            h={12}
            borderRadius="xl"
            bg="orange.500"
            align="center"
            justify="center"
            boxShadow="md"
          >
            <Icon as={Flame} boxSize={7} color="white" />
          </Flex>
          <Heading size="md" color={headingColor} textAlign="center" fontWeight="800">
            Heat Treatment Inspection
          </Heading>
          <Text fontSize="xs" color="gray.500" textAlign="center" fontWeight="600">
            INDUSTRIAL QUALITY CONTROL & VERIFICATION PORTAL
          </Text>
        </VStack>

        {/* Login Form */}
        <form onSubmit={handleLogin}>
          <VStack gap={4}>
            <Field.Root required invalid={hasAttemptedSubmit && !username.trim()}>
              <Field.Label fontSize="xs" fontWeight="700" color={labelColor}>
                USERNAME
              </Field.Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                size="md"
                autoComplete="username"
              />
              {hasAttemptedSubmit && !username.trim() && (
                <Field.ErrorText fontSize="2xs">Username is required.</Field.ErrorText>
              )}
            </Field.Root>

            <Field.Root required invalid={hasAttemptedSubmit && !password.trim()}>
              <Field.Label fontSize="xs" fontWeight="700" color={labelColor}>
                PASSWORD
              </Field.Label>
              <Box position="relative" w="full">
                <Input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  pr={10}
                />
                <Box position="absolute" right={1} top="50%" transform="translateY(-50%)">
                  <Tooltip
                    label={showPassword ? 'Hide password' : 'Show password'}
                    fontSize="xs"
                    hasArrow
                  >
                    <IconButton
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
              {hasAttemptedSubmit && !password.trim() && (
                <Field.ErrorText fontSize="2xs">Password is required.</Field.ErrorText>
              )}
            </Field.Root>

            <Button
              type="submit"
              colorPalette="blue"
              w="full"
              size="md"
              mt={2}
              loading={isSubmitting}
              fontWeight="700"
            >
              <LogIn size={18} />
              Sign In to System
            </Button>
          </VStack>
        </form>

        <Divider my={6} borderColor={cardBorder} />

        {/* Quick Role Prefill Buttons */}
        <Box>
          <Text
            fontSize="xs"
            fontWeight="700"
            color="gray.500"
            textTransform="uppercase"
            mb={2.5}
            textAlign="center"
          >
            Quick Role Prefill (Demo & Testing):
          </Text>
          <VStack gap={2}>
            <Button
              size="sm"
              w="full"
              variant="outline"
              colorPalette="blue"
              onClick={() => handleQuickPrefill('pe_john', 'Password123!')}
            >
              <Shield size={15} />
              Production Engineer (pe_john)
            </Button>
            <Button
              size="sm"
              w="full"
              variant="outline"
              colorPalette="purple"
              onClick={() => handleQuickPrefill('qi_david', 'Password123!')}
            >
              <UserCheck size={15} />
              Quality Inspector (qi_david)
            </Button>
          </VStack>
        </Box>
      </Box>
    </Flex>
  );
};

