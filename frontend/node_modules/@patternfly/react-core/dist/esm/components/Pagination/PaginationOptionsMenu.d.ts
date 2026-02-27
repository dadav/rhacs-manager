/// <reference types="react" />
import { PaginationToggleTemplateProps } from './ToggleTemplate';
import { PerPageOptions, OnPerPageSelect } from './Pagination';
export interface PaginationOptionsMenuProps extends React.HTMLProps<HTMLDivElement> {
    /** Custom class name added to the pagination options menu. */
    className?: string;
    /** Id added to the title of the pagination options menu. */
    widgetId?: string;
    /** Flag indicating if pagination options menu is disabled. */
    isDisabled?: boolean;
    /** Menu will open up or open down from the options menu toggle. */
    dropDirection?: 'up' | 'down';
    /** Minimum width of the pagination options menu. If set to "trigger", the minimum width will be set to the toggle width. */
    minWidth?: string | 'trigger';
    /** Array of titles and values which will be the options on the options menu dropdown. */
    perPageOptions?: PerPageOptions[];
    /** The title of the pagination options menu. */
    itemsPerPageTitle?: string;
    /** Current page number. */
    page?: number;
    /** The suffix to be displayed after each option on the options menu dropdown. */
    perPageSuffix?: string;
    /** The type or title of the items being paginated. */
    itemsTitle?: string;
    /** Accessible label for the options toggle. */
    optionsToggleAriaLabel?: string;
    /** The total number of items being paginated. */
    itemCount?: number;
    /** The first index of the items being paginated. */
    firstIndex?: number;
    /** The last index of the items being paginated. */
    lastIndex?: number;
    /** Flag to indicate whether to show last full page of results when user selects perPage
     * value that is greater than remaining rows.
     */
    isLastFullPageShown?: boolean;
    /** The number of items to be displayed per page. */
    perPage?: number;
    /** The number of the last page. */
    lastPage?: number;
    /** This will be shown in pagination toggle span. You can use firstIndex, lastIndex,
     * itemCount, and/or itemsTitle props.
     */
    toggleTemplate: ((props: PaginationToggleTemplateProps) => React.ReactElement<any>) | string;
    /** Function called when user selects number of items per page. */
    onPerPageSelect?: OnPerPageSelect;
    /** Label for the English word "of". */
    ofWord?: string;
    /** React ref for the container to append the options menu to. This is a static ref provided by the main pagination component. */
    containerRef?: React.RefObject<HTMLDivElement | null>;
    /** @beta The container to append the pagination options menu to. Overrides the containerRef prop. */
    appendTo?: HTMLElement | (() => HTMLElement) | 'inline';
    /** Flag indicating if scroll on focus of the first menu item should occur. */
    shouldPreventScrollOnItemFocus?: boolean;
    /** Time in ms to wait before firing the toggles' focus event. Defaults to 0 */
    focusTimeoutDelay?: number;
}
export declare const PaginationOptionsMenu: React.FunctionComponent<PaginationOptionsMenuProps>;
//# sourceMappingURL=PaginationOptionsMenu.d.ts.map