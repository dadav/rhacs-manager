/// <reference types="react" />
export interface FormFieldGroupExpandableProps extends Omit<React.HTMLProps<HTMLDivElement>, 'onToggle'> {
    /** Anything that can be rendered as form field group content. */
    children?: React.ReactNode;
    /** Additional classes added to the form field group. */
    className?: string;
    /** Form field group header */
    header?: React.ReactNode;
    /** Flag indicating if the form field group is initially expanded */
    isExpanded?: boolean;
    /** Aria-label to use on the form field group toggle button */
    toggleAriaLabel?: string;
    /** Flag indicating whether an expandable form field group has animations. This will always render
     * nested field group content rather than dynamically rendering them. This prop will be removed in
     * the next breaking change release in favor of defaulting to always-rendered items.
     */
    hasAnimations?: boolean;
}
export declare const FormFieldGroupExpandable: React.FunctionComponent<FormFieldGroupExpandableProps>;
//# sourceMappingURL=FormFieldGroupExpandable.d.ts.map