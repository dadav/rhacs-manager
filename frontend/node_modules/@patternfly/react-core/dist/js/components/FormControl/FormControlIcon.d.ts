/// <reference types="react" />
export declare const statusIcons: {
    success: import("react").ComponentClass<import("@patternfly/react-icons/dist/esm/createIcon").SVGIconProps, any>;
    error: import("react").ComponentClass<import("@patternfly/react-icons/dist/esm/createIcon").SVGIconProps, any>;
    warning: import("react").ComponentClass<import("@patternfly/react-icons/dist/esm/createIcon").SVGIconProps, any>;
};
export interface FormControlIconProps extends React.HTMLProps<HTMLDivElement> {
    /** Additional class names added to the text input icon wrapper. */
    className?: string;
    /** A custom icon to render instead of a status icon. */
    customIcon?: React.ReactNode;
    /** The status icon to render. */
    status?: 'success' | 'error' | 'warning';
}
export declare const FormControlIcon: ({ status, customIcon, className, ...props }: FormControlIconProps) => import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=FormControlIcon.d.ts.map