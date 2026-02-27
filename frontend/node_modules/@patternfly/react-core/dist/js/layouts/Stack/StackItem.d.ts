/// <reference types="react" />
export interface StackItemProps extends React.HTMLProps<HTMLDivElement> {
    /** Flag indicating if this stack layout item should fill the available vertical space. */
    isFilled?: boolean;
    /** Additional classes added to the stack layout item. */
    children?: React.ReactNode;
    /** Content rendered inside the stack layout item. */
    className?: string;
    /** Sets the base component to render. Defaults to div. */
    component?: React.ReactNode;
}
export declare const StackItem: React.FunctionComponent<StackItemProps>;
//# sourceMappingURL=StackItem.d.ts.map