/// <reference types="react" />
/** Acts as the container for the DualListSelectorControl sub-components. */
export interface DualListSelectorControlsWrapperProps extends React.HTMLProps<HTMLDivElement> {
    /** Anything that can be rendered inside of the wrapper. */
    children?: React.ReactNode;
    /** Additional classes added to the wrapper. */
    className?: string;
    /** @hide Forwarded ref */
    innerRef?: React.RefObject<HTMLDivElement | null>;
    /** Accessible label for the dual list selector controls wrapper. */
    'aria-label'?: string;
}
export declare const DualListSelectorControlsWrapperBase: React.FunctionComponent<DualListSelectorControlsWrapperProps>;
export declare const DualListSelectorControlsWrapper: import("react").ForwardRefExoticComponent<Omit<DualListSelectorControlsWrapperProps, "ref"> & import("react").RefAttributes<HTMLDivElement>>;
//# sourceMappingURL=DualListSelectorControlsWrapper.d.ts.map