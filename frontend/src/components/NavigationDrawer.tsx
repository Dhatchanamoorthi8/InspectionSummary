import React from 'react';
import {
  VStack,
  HStack,
  Box,
  Flex,
  Text,
  Icon,
  Button,
  Badge,
} from '@chakra-ui/react';
import {
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
} from './ui/drawer';
import { Avatar } from './ui/avatar';
import { useColorModeValue } from './ui/color-mode';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  Flame,
  LayoutDashboard,
  ClipboardList,
  Layers,
  Users,
  FileCheck,
  FileSpreadsheet,
  History,
  LogOut,
  LucideIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSignatureModal: () => void;
}

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  exact?: boolean;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  onClose,
  onOpenSignatureModal,
}) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isPE = user?.role === 'PRODUCTION_ENGINEER';

  const peNavItems: NavItem[] = [
    { label: 'Dashboard', path: '/production/dashboard', icon: LayoutDashboard, exact: true },
    { label: 'Inspection Requests', path: '/requests', icon: ClipboardList, exact: true },
    { label: 'Part Master Data', path: '/parts', icon: Layers, exact: true },
    { label: 'User Management', path: '/users', icon: Users, exact: true },
    { label: 'Inspection Summary', path: '/requests?status=Completed', icon: FileCheck },
    { label: 'Summary Report (Pivot)', path: '/reports/summary', icon: FileSpreadsheet, exact: true },
    { label: 'Audit Trail', path: '/audit-log', icon: History, exact: true },
  ];

  const inspectorNavItems: NavItem[] = [
    { label: 'Inspector Dashboard', path: '/inspector/dashboard', icon: LayoutDashboard, exact: true },
    { label: 'Assigned Tasks', path: '/tasks', icon: ClipboardList, exact: true },
    { label: 'Completed Inspections', path: '/tasks?status=Completed', icon: FileCheck },
    { label: 'Inspection Summary', path: '/reports/summary', icon: FileSpreadsheet, exact: true },
  ];

  const navItems = isPE ? peNavItems : inspectorNavItems;

  const isItemActive = (item: NavItem) => {
    const currentPath = location.pathname;
    const currentSearch = location.search;
    const currentFull = currentPath + currentSearch;

    if (item.path.includes('?')) {
      return currentFull === item.path;
    }

    if (item.path === '/requests') {
      if (currentSearch.includes('status=Completed')) {
        return false;
      }
      return currentPath === '/requests';
    }

    if (item.path === '/parts') {
      if (currentSearch.includes('import=true')) {
        return false;
      }
      return currentPath === '/parts';
    }

    if (item.path === '/tasks') {
      if (currentSearch.includes('status=Completed')) {
        return false;
      }
      return currentPath === '/tasks';
    }

    if (item.exact) {
      return currentPath === item.path;
    }

    return currentPath.startsWith(item.path);
  };

  const handleNavigate = () => {
    onClose();
  };

  const handleOpenSignature = () => {
    onClose();
    onOpenSignatureModal();
  };

  const handleLogout = () => {
    onClose();
    logout();
  };

  const drawerBg = useColorModeValue('white', 'gray.900');
  const drawerBorder = useColorModeValue('gray.200', 'gray.800');
  const brandTitleColor = useColorModeValue('gray.900', 'white');
  const brandSubColor = useColorModeValue('gray.500', 'gray.400');
  const navInactiveColor = useColorModeValue('gray.700', 'gray.300');
  const navInactiveHoverBg = useColorModeValue('gray.100', 'gray.800');
  const navInactiveHoverColor = useColorModeValue('gray.900', 'white');
  const navIconColor = useColorModeValue('gray.500', 'gray.400');
  const userCardBg = useColorModeValue('gray.100', 'gray.800');
  const userNameColor = useColorModeValue('gray.900', 'white');
  const logoutColor = useColorModeValue('gray.600', 'red.300');
  const logoutHoverBg = useColorModeValue('red.50', 'red.900');
  const logoutHoverColor = useColorModeValue('red.600', 'red.100');

  return (
    <Drawer
      isOpen={isOpen}
      placement="start"
      onClose={onClose}
      size="xs"
    >
      <DrawerOverlay />
      <DrawerContent bg={drawerBg} color={navInactiveColor}>
        <DrawerCloseButton color={navIconColor} _hover={{ color: brandTitleColor }} top={4} right={4} />

        <DrawerHeader borderBottomWidth="1px" borderColor={drawerBorder} py={4} px={5}>
          <HStack gap={2.5}>
            <Flex
              w={8}
              h={8}
              borderRadius="md"
              bg="orange.500"
              align="center"
              justify="center"
            >
              <Icon as={Flame} boxSize={5} color="white" />
            </Flex>
            <Box>
              <Text fontSize="sm" fontWeight="800" letterSpacing="wider" lineHeight="1.1" color={brandTitleColor}>
                INDUSTRIAL QC
              </Text>
              <Text fontSize="9px" color={brandSubColor} fontWeight="600" letterSpacing="widest">
                INSPECTION PLATFORM
              </Text>
            </Box>
          </HStack>
        </DrawerHeader>

        <DrawerBody px={3} py={4}>
          <VStack gap={1.5} align="stretch">
            {navItems.map((item) => {
              const active = isItemActive(item);
              return (
                <Button
                  key={item.path}
                  asChild
                  onClick={handleNavigate}
                  variant="ghost"
                  size="md"
                  w="full"
                  justifyContent="flex-start"
                  px={3}
                  py={3}
                  h="42px"
                  color={active ? 'white' : navInactiveColor}
                  bg={active ? 'brand.500' : 'transparent'}
                  borderLeftWidth={active ? '3px' : '0px'}
                  borderLeftColor="brand.200"
                  _hover={{
                    bg: active ? 'brand.600' : navInactiveHoverBg,
                    color: active ? 'white' : navInactiveHoverColor,
                    textDecoration: 'none',
                  }}
                  fontWeight={active ? '700' : '500'}
                  fontSize="sm"
                  borderRadius="md"
                >
                  <RouterLink to={item.path}>
                    <Icon
                      as={item.icon}
                      boxSize={4}
                      color={active ? 'white' : navIconColor}
                      mr={2}
                    />
                    {item.label}
                  </RouterLink>
                </Button>
              );
            })}
          </VStack>
        </DrawerBody>

        <DrawerFooter
          borderTopWidth="1px"
          borderColor={drawerBorder}
          flexDirection="column"
          alignItems="stretch"
          p={4}
          gap={3}
        >
          {/* User Profile Mini Card */}
          <HStack gap={3} p={2} bg={userCardBg} borderRadius="md">
            <Avatar size="sm" name={user?.fullName || user?.username} bg="brand.500" color="white" />
            <Box flex={1} overflow="hidden">
              <Text fontSize="xs" fontWeight="700" color={userNameColor} truncate>
                {user?.fullName || user?.username}
              </Text>
              <Badge
                colorPalette={isPE ? 'blue' : 'green'}
                fontSize="2xs"
                variant="subtle"
                textTransform="uppercase"
              >
                {isPE ? 'Production Eng' : 'Quality Inspector'}
              </Badge>
            </Box>
          </HStack>

          {/* Action Buttons */}
          <Box w="full">
            <Button
              size="sm"
              variant="ghost"
              color={logoutColor}
              _hover={{ bg: logoutHoverBg, color: logoutHoverColor }}
              onClick={handleLogout}
              justifyContent="flex-start"
              w="full"
            >
              <Icon as={LogOut} boxSize={4} color="red.400" mr={2} />
              Logout
            </Button>
          </Box>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
