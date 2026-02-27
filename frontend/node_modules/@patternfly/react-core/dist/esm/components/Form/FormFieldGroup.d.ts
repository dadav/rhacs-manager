/// <reference types="react" />
export interface FormFieldGroupProps extends Omit<React.HTMLProps<HTMLDivElement>, 'label' | 'onToggle'> {
    /** Anything that can be rendered as form field group content. */
    children?: React.ReactNode;
    /** Additional classes added to the form field group. */
    className?: string;
    /** Form field group header */
    header?: React.ReactNode;
}
export declare const FormFieldGroup: React.FunctionComponent<FormFieldGroupProps>;
//# sourceMappingURL=FormFieldGroup.d.ts.map