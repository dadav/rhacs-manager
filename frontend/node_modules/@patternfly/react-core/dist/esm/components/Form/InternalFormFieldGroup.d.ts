/// <reference types="react" />
export interface InternalFormFieldGroupProps extends Omit<React.HTMLProps<HTMLDivElement>, 'label' | 'onToggle'> {
    /** Anything that can be rendered as form field group content. */
    children?: React.ReactNode;
    /** Additional classes added to the form field group. */
    className?: string;
    /** Form field group header */
    header?: any;
    /** Flag indicating if the field group is expandable */
    isExpandable?: boolean;
    /** Flag indicate if the form field group is expanded. Modifies the card to be expandable. */
    isExpanded?: boolean;
    /** Function callback called when user clicks toggle button */
    onToggle?: () => void;
    /** Aria-label to use on the form field group toggle button */
    toggleAriaLabel?: string;
    /** Flag indicating whether an expandable form field group has animations. This will always render
     * nested field group content rather than dynamically rendering them. This prop will be removed in
     * the next breaking change release in favor of defaulting to always-rendered items.
     */
    hasAnimations?: boolean;
}
export declare const InternalFormFieldGroup: React.FunctionComponent<InternalFormFieldGroupProps>;
//# sourceMappingURL=InternalFormFieldGroup.d.ts.map