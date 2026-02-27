/// <reference types="react" />
export declare const variantIcons: {
    success: import("react").ComponentClass<import("@patternfly/react-icons/dist/esm/createIcon").SVGIconProps, any>;
    danger: import("react").ComponentClass<import("@patternfly/react-icons/dist/esm/createIcon").SVGIconProps, any>;
    warning: import("react").ComponentClass<import("@patternfly/react-icons/dist/esm/createIcon").SVGIconProps, any>;
    info: import("react").ComponentClass<import("@patternfly/react-icons/dist/esm/createIcon").SVGIconProps, any>;
    custom: import("react").ComponentClass<import("@patternfly/react-icons/dist/esm/createIcon").SVGIconProps, any>;
};
export interface AlertIconProps extends React.HTMLProps<HTMLDivElement> {
    /** Additional class names added to the alert icon. */
    className?: string;
    /** A custom icon. If not set the icon is set according to the variant. */
    customIcon?: React.ReactNode;
    /** Variant of the alert icon. */
    variant: 'success' | 'danger' | 'warning' | 'info' | 'custom';
}
export declare const AlertIcon: ({ variant, customIcon, className, ...props }: AlertIconProps) => import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=AlertIcon.d.ts.map