// Astryx imports stay confined to components/ui/ (see the design spec's
// Global Constraints, §7.0) so a breaking change in the beta-quality Astryx
// dependency has one blast radius. This thin wrapper is the sanctioned
// entry point for AppShell — mirrors how AppSidebar.tsx wraps SideNav/Badge.
export { AppShell as AppShellFrame } from '@astryxdesign/core/AppShell';
export type { AppShellProps as AppShellFrameProps } from '@astryxdesign/core/AppShell';
