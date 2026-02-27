/// <reference types="react" />
export interface StackProps extends React.HTMLProps<HTMLDivElement> {
    /** Adds space between children. */
    hasGutter?: boolean;
    /** Content rendered inside the stack layout. */
    children?: React.ReactNode;
    /** Additional classes added to the stack layout. */
    className?: string;
    /** Sets the base component to render. Defaults to div. */
    component?: React.ReactNode;
}
export declare const Stack: React.FunctionComponent<StackProps>;
//# sourceMappingURL=Stack.d.ts.map