import React from 'react';
import { AppShell } from './AppShell';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return <AppShell>{children}</AppShell>;
};
