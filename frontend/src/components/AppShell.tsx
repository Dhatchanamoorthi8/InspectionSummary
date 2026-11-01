import React, { useState } from 'react';
import {
  Box,
  Flex,
  useDisclosure,
} from '@chakra-ui/react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
} from './ui/dialog';
import { useColorModeValue } from './ui/color-mode';
import { useToast } from './ui/toaster';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { NavigationDrawer } from './NavigationDrawer';
import { SignaturePad } from './SignaturePad';
import { useAuth } from '../context/AuthContext';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { user, updateSignature } = useAuth();
  const toast = useToast();

  const shellBg = useColorModeValue('gray.50', 'gray.900');

  // Desktop sidebar collapse state with localStorage persistence
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('sidebar_collapsed');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar_collapsed', JSON.stringify(next));
      } catch (e) {
        console.error('Failed to save sidebar state to localStorage', e);
      }
      return next;
    });
  };

  // Mobile navigation drawer state
  const {
    open: isMobileNavOpen,
    onOpen: onOpenMobileNav,
    onClose: onCloseMobileNav,
  } = useDisclosure();

  // Digital Signature Modal state
  const [isSigModalOpen, setIsSigModalOpen] = useState(false);
  const [isUpdatingSig, setIsUpdatingSig] = useState(false);

  const handleSaveSignature = async (sigData: string) => {
    setIsUpdatingSig(true);
    try {
      await updateSignature(sigData);
      toast({
        title: 'Signature saved',
        description: 'Your digital signature snapshot was updated successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      setIsSigModalOpen(false);
    } catch (err: any) {
      toast({
        title: 'Error saving signature',
        description: err.response?.data?.message || err.message,
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setIsUpdatingSig(false);
    }
  };

  return (
    <Box minH="100vh" bg={shellBg} position="relative">
      {/* Desktop Fixed Left Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />

      {/* Mobile/Tablet Accessible Navigation Drawer (< 1024px) */}
      <NavigationDrawer
        isOpen={isMobileNavOpen}
        onClose={onCloseMobileNav}
        onOpenSignatureModal={() => setIsSigModalOpen(true)}
      />

      {/* Main Content Area */}
      <Flex
        direction="column"
        minH="100vh"
        ml={{ base: 0, lg: isSidebarCollapsed ? '68px' : '240px' }}
        transition="margin-left 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
        bg={shellBg}
      >
        {/* Top Header */}
        <Header
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={handleToggleSidebar}
          onOpenMobileMenu={onOpenMobileNav}
          onOpenSignatureModal={() => setIsSigModalOpen(true)}
        />

        {/* Page Content */}
        <Box
          as="main"
          flex={1}
          py={{ base: 4, md: 6 }}
          px={{ base: 3, sm: 4, md: 6 }}
          maxW="1600px"
          w="full"
          mx="auto"
        >
          {children}
        </Box>
      </Flex>

      {/* Shared Digital Signature Modal */}
      <Modal
        isOpen={isSigModalOpen}
        onClose={() => setIsSigModalOpen(false)}
        size="lg"
        isCentered
      >
        <ModalOverlay bg="blackAlpha.600" />
        <ModalContent mx={4}>
          <ModalHeader fontSize="md" fontWeight="700">
            Digital Signature Configuration
          </ModalHeader>
          <ModalCloseButton disabled={isUpdatingSig} />
          <ModalBody pb={6}>
            <SignaturePad
              initialSignature={user?.signatureData}
              onSave={handleSaveSignature}
              isLoading={isUpdatingSig}
            />
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};
