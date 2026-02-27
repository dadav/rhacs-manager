/// <reference types="react" />
import { TooltipPosition } from '../Tooltip';
export declare const variantIcons: {
    success: import("react").ComponentClass<SVGIconProps, any>;
    danger: import("react").ComponentClass<SVGIconProps, any>;
    warning: import("react").ComponentClass<SVGIconProps, any>;
    info: import("react").ComponentClass<SVGIconProps, any>;
    custom: import("react").ComponentClass<SVGIconProps, any>;
};
export interface NotificationDrawerListItemHeaderProps extends React.HTMLProps<HTMLDivElement> {
    /**  Actions rendered inside the notification drawer list item header */
    children?: React.ReactNode;
    /**  Additional classes for notification drawer list item header. */
    className?: string;
    /**  Add custom icon for notification drawer list item header */
    icon?: React.ReactNode;
    /**  Notification drawer list item header screen reader title */
    srTitle?: string;
    /**  Notification drawer list item title */
    title: string;
    /**  Variant indicates the severity level */
    variant?: 'success' | 'danger' | 'warning' | 'info' | 'custom';
    /** Truncate title to number of lines */
    truncateTitle?: number;
    /** Position of the tooltip which is displayed if text is truncated */
    tooltipPosition?: TooltipPosition | 'auto' | 'top' | 'bottom' | 'left' | 'right' | 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end' | 'left-start' | 'left-end' | 'right-start' | 'right-end';
    /** Sets the heading level to use for the list item header title. Default is h2. */
    headingLevel?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    /** Removes the offset of the notification drawer actions. */
    actionHasNoOffset?: boolean;
}
export declare const NotificationDrawerListItemHeader: React.FunctionComponent<NotificationDrawerListItemHeaderProps>;
//# sourceMappingURL=NotificationDrawerListItemHeader.d.ts.map