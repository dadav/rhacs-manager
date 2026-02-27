/// <reference types="react" />
import { TooltipPosition, TooltipProps } from '../Tooltip';
export declare enum TruncatePosition {
    start = "start",
    end = "end",
    middle = "middle"
}
export interface TruncateProps extends Omit<React.HTMLProps<HTMLSpanElement | HTMLAnchorElement>, 'ref'> {
    /** Class to add to outer span */
    className?: string;
    /** Text to truncate */
    content: string;
    /** An HREF to turn the truncate wrapper into an anchor element. For more custom control, use the
     * tooltipProps with a triggerRef property passed in.
     */
    href?: string;
    /** The number of characters displayed in the second half of a middle truncation. This will be overridden by
     * the maxCharsDisplayed prop.
     */
    trailingNumChars?: number;
    /** The maximum number of characters to display before truncating. This will always truncate content
     * when its length exceeds the value passed to this prop, and container width/resizing will not affect truncation.
     */
    maxCharsDisplayed?: number;
    /** The content to use to signify omission of characters when using the maxCharsDisplayed prop.
     * By default this will render an ellipsis.
     */
    omissionContent?: string;
    /** Where the text will be truncated */
    position?: 'start' | 'middle' | 'end';
    /** Tooltip position */
    tooltipPosition?: TooltipPosition | 'auto' | 'top' | 'bottom' | 'left' | 'right' | 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end' | 'left-start' | 'left-end' | 'right-start' | 'right-end';
    /** Additional props to pass to the tooltip. */
    tooltipProps?: Omit<TooltipProps, 'content'>;
    /** @hide Forwarded ref */
    innerRef?: React.Ref<any>;
}
export declare const Truncate: import("react").ForwardRefExoticComponent<TruncateProps & import("react").RefAttributes<HTMLSpanElement | HTMLAnchorElement>>;
//# sourceMappingURL=Truncate.d.ts.map