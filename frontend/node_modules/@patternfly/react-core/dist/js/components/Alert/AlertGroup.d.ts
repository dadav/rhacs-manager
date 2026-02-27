/// <reference types="react" />
export interface AlertGroupProps extends Omit<React.HTMLProps<HTMLUListElement>, 'className'> {
    /** Additional classes added to the AlertGroup */
    className?: string;
    /** Alerts to be rendered in the AlertGroup */
    children?: React.ReactNode;
    /** @beta Flag to indicate whether Alerts are animated upon rendering and being dismissed. This is intended
     * to remain false for testing purposes only.
     */
    hasAnimations?: boolean;
    /** Toast notifications are positioned at the top right corner of the viewport */
    isToast?: boolean;
    /** Turns the container into a live region so that changes to content within the AlertGroup, such as appending an Alert, are reliably announced to assistive technology. */
    isLiveRegion?: boolean;
    /** Determine where the alert is appended to */
    appendTo?: HTMLElement | (() => HTMLElement);
    /** Function to call if user clicks on overflow message */
    onOverflowClick?: () => void;
    /** Custom text to show for the overflow message */
    overflowMessage?: string;
    /** Adds an accessible label to the alert group. */
    'aria-label'?: string;
}
export declare const AlertGroup: React.FunctionComponent<AlertGroupProps>;
//# sourceMappingURL=AlertGroup.d.ts.map