/// <reference types="react" />
export interface PageGroupProps extends React.HTMLProps<HTMLDivElement> {
    /** Additional classes to apply to the PageGroup */
    className?: string;
    /** Content rendered inside of the PageGroup */
    children?: React.ReactNode;
    /** Modifier indicating if the PageBreadcrumb is sticky to the top or bottom at various breakpoints */
    stickyOnBreakpoint?: {
        default?: 'top' | 'bottom';
        sm?: 'top' | 'bottom';
        md?: 'top' | 'bottom';
        lg?: 'top' | 'bottom';
        xl?: 'top' | 'bottom';
        '2xl'?: 'top' | 'bottom';
    };
    /** Enables the page group to fill the available vertical space if true, or disable filling if false. */
    isFilled?: boolean;
    /** Modifier indicating if PageGroup should have a shadow at the top */
    hasShadowTop?: boolean;
    /** Modifier indicating if PageGroup should have a shadow at the bottom */
    hasShadowBottom?: boolean;
    /** Flag indicating if the PageGroup has a scrolling overflow */
    hasOverflowScroll?: boolean;
    /** Adds an accessible name to the page group when the hasOverflowScroll prop is set to true. */
    'aria-label'?: string;
}
export declare const PageGroup: {
    ({ className, children, stickyOnBreakpoint, isFilled, hasShadowTop, hasShadowBottom, hasOverflowScroll, "aria-label": ariaLabel, ...props }: PageGroupProps): import("react/jsx-runtime").JSX.Element;
    displayName: string;
};
//# sourceMappingURL=PageGroup.d.ts.map