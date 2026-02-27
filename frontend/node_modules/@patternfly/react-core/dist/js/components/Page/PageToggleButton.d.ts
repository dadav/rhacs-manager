/// <reference types="react" />
import { ButtonProps } from '../../components/Button';
export interface PageToggleButtonProps extends ButtonProps {
    /** Content of the page toggle button */
    children?: React.ReactNode;
    /** True if the sidebar is shown  */
    isSidebarOpen?: boolean;
    /** Callback function to handle the sidebar toggle button, managed by the Page component if the Page isManagedSidebar prop is set to true */
    onSidebarToggle?: () => void;
    /** Button id */
    id?: string;
    /** Adds an accessible name to the toggle button. */
    'aria-label'?: string;
    /** Flag indicating whether the hamburger button variation with animations should be used. */
    isHamburgerButton?: boolean;
    /** IsHamburgerButton must be true for hamburgerVariant to be have an effect. Adjusts and animates the hamburger icon to indicate what will happen upon clicking the button. */
    hamburgerVariant?: 'expand' | 'collapse';
}
export declare const PageToggleButton: React.FunctionComponent<PageToggleButtonProps>;
//# sourceMappingURL=PageToggleButton.d.ts.map