/// <reference types="react" />
export interface SplitProps extends React.HTMLProps<HTMLDivElement> {
    /** Adds space between children. */
    hasGutter?: boolean;
    /** Allows children to wrap. */
    isWrappable?: boolean;
    /** content rendered inside the split layout. */
    children?: React.ReactNode;
    /** Additional classes added to the split layout. */
    className?: string;
    /** Sets the base component to render. Defaults to div. */
    component?: React.ReactNode;
}
export declare const Split: React.FunctionComponent<SplitProps>;
//# sourceMappingURL=Split.d.ts.map