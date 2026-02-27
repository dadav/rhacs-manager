/// <reference types="react" />
import { ButtonProps } from '../Button';
export declare enum NotificationBadgeVariant {
    read = "read",
    unread = "unread",
    attention = "attention"
}
export interface NotificationBadgeProps extends Omit<ButtonProps, 'variant'> {
    /** Adds an accessible label to the notification badge. */
    'aria-label'?: string;
    /** Icon to display for attention variant. */
    attentionIcon?: React.ReactNode;
    /** Content rendered inside the notification badge. */
    children?: React.ReactNode;
    /** Additional classes added to the notification badge. */
    className?: string;
    /** A number displayed in the badge alongside the icon. */
    count?: number;
    /** Icon to display in the notification badge. */
    icon?: React.ReactNode;
    /** Flag for applying expanded styling and setting the aria-expanded attribute on the
     * notification badge.
     */
    isExpanded?: boolean;
    /** Determines the variant of the notification badge. */
    variant?: NotificationBadgeVariant | 'read' | 'unread' | 'attention';
    /** Flag indicating whether the notification badge animation should be triggered. Each
     * time this prop is true, the animation will be triggered a single time.
     */
    shouldNotify?: boolean;
    /** Callback for when the animation of the notification badge icon ends.
     */
    onAnimationEnd?: (event: React.AnimationEvent<HTMLButtonElement>) => void;
}
export declare const NotificationBadge: React.FunctionComponent<NotificationBadgeProps>;
//# sourceMappingURL=NotificationBadge.d.ts.map