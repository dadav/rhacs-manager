/// <reference types="react" />
import { PopperOptions } from '../../helpers';
import { TabProps } from './Tab';
/** @deprecated Use PopperOptions instead */
export type HorizontalOverflowPopperProps = PopperOptions;
export interface OverflowTabProps extends React.HTMLProps<HTMLLIElement> {
    /** Additional classes added to the overflow tab */
    className?: string;
    /** The tabs that should be displayed in the menu */
    overflowingTabs?: TabProps[];
    /** Flag which shows the count of overflowing tabs when enabled */
    showTabCount?: boolean;
    /** The text which displays when an overflowing tab isn't selected */
    defaultTitleText?: string;
    /** The aria label applied to the button which toggles the tab overflow menu */
    toggleAriaLabel?: string;
    /** z-index of the overflow tab */
    zIndex?: number;
    /** Flag indicating if scroll on focus of the first menu item should occur. */
    shouldPreventScrollOnItemFocus?: boolean;
    /** Time in ms to wait before firing the toggles' focus event. Defaults to 0 */
    focusTimeoutDelay?: number;
    /** Additional props to spread to the popper menu. */
    popperProps?: PopperOptions;
}
export declare const OverflowTab: React.FunctionComponent<OverflowTabProps>;
//# sourceMappingURL=OverflowTab.d.ts.map