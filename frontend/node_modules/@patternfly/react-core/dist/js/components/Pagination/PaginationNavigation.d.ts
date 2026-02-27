import { Component } from 'react';
import { OnSetPage } from './Pagination';
import { PickOptional } from '../../helpers';
export interface PaginationNavigationProps extends React.HTMLProps<HTMLElement> {
    /** Additional classes for the pagination navigation container. */
    className?: string;
    /** Accessible label for the input displaying the current page. */
    currPageAriaLabel?: string;
    /** The number of first page where pagination starts. */
    firstPage?: number;
    /** Flag indicating if the pagination is compact. */
    isCompact?: boolean;
    /** Flag indicating if the pagination is disabled. */
    isDisabled?: boolean;
    /** Total number of items. */
    itemCount?: number;
    /** The number of the last page. */
    lastPage?: number;
    /** Label for the English word "of". */
    ofWord?: string;
    /** The number of the current page. */
    page: number;
    /** The title of a page displayed beside the page number. */
    pagesTitle?: string;
    /** The title of a page displayed beside the page number (the plural form). */
    pagesTitlePlural?: string;
    /** Accessible label for the pagination component. */
    paginationAriaLabel?: string;
    /** Number of items per page. */
    perPage?: number;
    /** Accessible label for the button which moves to the first page. */
    toFirstPageAriaLabel?: string;
    /** Accessible label for the button which moves to the last page. */
    toLastPageAriaLabel?: string;
    /** Accessible label for the button which moves to the next page. */
    toNextPageAriaLabel?: string;
    /** Accessible label for the button which moves to the previous page. */
    toPreviousPageAriaLabel?: string;
    /** Function called when user clicks to navigate to first page. */
    onFirstClick?: (event: React.SyntheticEvent<HTMLButtonElement>, page: number) => void;
    /** Function called when user clicks to navigate to last page. */
    onLastClick?: (event: React.SyntheticEvent<HTMLButtonElement>, page: number) => void;
    /** Function called when user clicks to navigate to next page. */
    onNextClick?: (event: React.SyntheticEvent<HTMLButtonElement>, page: number) => void;
    /** Function called when user clicks to navigate to previous page. */
    onPreviousClick?: (event: React.SyntheticEvent<HTMLButtonElement>, page: number) => void;
    /** Function called when user inputs page number. */
    onPageInput?: (event: React.KeyboardEvent<HTMLInputElement>, page: number) => void;
    /** Function called when page is changed. */
    onSetPage: OnSetPage;
}
export interface PaginationNavigationState {
    userInputPage?: number | string;
}
declare class PaginationNavigation extends Component<PaginationNavigationProps, PaginationNavigationState> {
    static displayName: string;
    constructor(props: PaginationNavigationProps);
    static defaultProps: PickOptional<PaginationNavigationProps>;
    private static parseInteger;
    private onChange;
    private onKeyDown;
    handleNewPage: (_evt: React.MouseEvent | React.KeyboardEvent | MouseEvent, newPage: number) => void;
    componentDidUpdate(lastState: PaginationNavigationProps): void;
    render(): import("react/jsx-runtime").JSX.Element;
}
export { PaginationNavigation };
//# sourceMappingURL=PaginationNavigation.d.ts.map