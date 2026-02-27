/// <reference types="react" />
export interface SplitItemProps extends React.HTMLProps<HTMLDivElement> {
    /** Flag indicating if this split layout item should fill the available horizontal space. */
    isFilled?: boolean;
    /** Content rendered inside the split layout item. */
    children?: React.ReactNode;
    /** Additional classes added to the split layout item. */
    className?: string;
    /** Sets the base component to render. Defaults to div. */
    component?: React.ReactNode;
}
export declare const SplitItem: React.FunctionComponent<SplitItemProps>;
//# sourceMappingURL=SplitItem.d.ts.map