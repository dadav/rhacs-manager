"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaginationNavigation = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const pagination_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Pagination/pagination"));
const react_styles_1 = require("@patternfly/react-styles");
const angle_left_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/angle-left-icon'));
const angle_double_left_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/angle-double-left-icon'));
const angle_right_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/angle-right-icon'));
const angle_double_right_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/angle-double-right-icon'));
const Button_1 = require("../Button");
const TextInput_1 = require("../TextInput");
const helpers_1 = require("../../helpers");
const constants_1 = require("../../helpers/constants");
class PaginationNavigation extends react_1.Component {
    constructor(props) {
        super(props);
        this.handleNewPage = (_evt, newPage) => {
            const { perPage, onSetPage } = this.props;
            const startIdx = (newPage - 1) * perPage;
            const endIdx = newPage * perPage;
            return onSetPage(_evt, newPage, perPage, startIdx, endIdx);
        };
        this.state = { userInputPage: this.props.page };
    }
    static parseInteger(input, lastPage) {
        // eslint-disable-next-line radix
        let inputPage = Number.parseInt(input, 10);
        if (!Number.isNaN(inputPage)) {
            inputPage = inputPage > lastPage ? lastPage : inputPage;
            inputPage = inputPage < 1 ? 1 : inputPage;
        }
        return inputPage;
    }
    onChange(event, lastPage) {
        const inputPage = PaginationNavigation.parseInteger(event.currentTarget.value, lastPage);
        this.setState({ userInputPage: Number.isNaN(inputPage) ? event.currentTarget.value : inputPage });
    }
    onKeyDown(event, page, lastPage, onPageInput) {
        const allowedKeys = [
            'Tab',
            'Backspace',
            'Delete',
            'ArrowLeft',
            'ArrowRight',
            'Home',
            'End',
            'ArrowUp',
            'ArrowDown'
        ];
        if (event.key === constants_1.KeyTypes.Enter) {
            const inputPage = PaginationNavigation.parseInteger(this.state.userInputPage, lastPage);
            onPageInput(event, Number.isNaN(inputPage) ? page : inputPage);
            this.handleNewPage(event, Number.isNaN(inputPage) ? page : inputPage);
        }
        else if (!/^\d*$/.test(event.key) && !allowedKeys.includes(event.key)) {
            event.preventDefault();
        }
    }
    componentDidUpdate(lastState) {
        if (this.props.page !== lastState.page &&
            this.props.page <= this.props.lastPage &&
            this.state.userInputPage !== this.props.page) {
            this.setState({ userInputPage: this.props.page });
        }
    }
    render() {
        const _a = this.props, { page, 
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        perPage, 
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        onSetPage, isDisabled, itemCount, lastPage, firstPage, pagesTitle, pagesTitlePlural, toLastPageAriaLabel, toNextPageAriaLabel, toFirstPageAriaLabel, toPreviousPageAriaLabel, currPageAriaLabel, paginationAriaLabel, ofWord, onNextClick, onPreviousClick, onFirstClick, onLastClick, onPageInput, className, isCompact } = _a, props = tslib_1.__rest(_a, ["page", "perPage", "onSetPage", "isDisabled", "itemCount", "lastPage", "firstPage", "pagesTitle", "pagesTitlePlural", "toLastPageAriaLabel", "toNextPageAriaLabel", "toFirstPageAriaLabel", "toPreviousPageAriaLabel", "currPageAriaLabel", "paginationAriaLabel", "ofWord", "onNextClick", "onPreviousClick", "onFirstClick", "onLastClick", "onPageInput", "className", "isCompact"]);
        const { userInputPage } = this.state;
        return ((0, jsx_runtime_1.jsxs)("nav", Object.assign({ className: (0, react_styles_1.css)(pagination_1.default.paginationNav, className), "aria-label": paginationAriaLabel }, props, { children: [!isCompact && ((0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(pagination_1.default.paginationNavControl, pagination_1.default.modifiers.first), children: (0, jsx_runtime_1.jsx)(Button_1.Button, { variant: Button_1.ButtonVariant.plain, isDisabled: isDisabled || page === firstPage || page === 0, "aria-label": toFirstPageAriaLabel, "data-action": "first", onClick: (event) => {
                            onFirstClick(event, 1);
                            this.handleNewPage(event, 1);
                            this.setState({ userInputPage: 1 });
                        }, icon: (0, jsx_runtime_1.jsx)(angle_double_left_icon_1.default, {}) }) })), (0, jsx_runtime_1.jsx)("div", { className: pagination_1.default.paginationNavControl, children: (0, jsx_runtime_1.jsx)(Button_1.Button, { variant: Button_1.ButtonVariant.plain, isDisabled: isDisabled || page === firstPage || page === 0, "data-action": "previous", onClick: (event) => {
                            const newPage = page - 1 >= 1 ? page - 1 : 1;
                            onPreviousClick(event, newPage);
                            this.handleNewPage(event, newPage);
                            this.setState({ userInputPage: newPage });
                        }, "aria-label": toPreviousPageAriaLabel, icon: (0, jsx_runtime_1.jsx)(angle_left_icon_1.default, {}) }) }), !isCompact && ((0, jsx_runtime_1.jsxs)("div", { className: pagination_1.default.paginationNavPageSelect, children: [(0, jsx_runtime_1.jsx)(TextInput_1.TextInput, { "aria-label": currPageAriaLabel, type: "number", isDisabled: isDisabled || (itemCount && page === firstPage && page === lastPage && itemCount >= 0) || page === 0, min: lastPage <= 0 && firstPage <= 0 ? 0 : 1, max: lastPage, value: userInputPage, onKeyDown: (event) => this.onKeyDown(event, page, lastPage, onPageInput), onChange: (event) => this.onChange(event, lastPage) }), (itemCount || itemCount === 0) && ((0, jsx_runtime_1.jsxs)("span", { "aria-hidden": "true", children: [ofWord, " ", pagesTitle ? (0, helpers_1.pluralize)(lastPage, pagesTitle, pagesTitlePlural) : lastPage] }))] })), (0, jsx_runtime_1.jsx)("div", { className: pagination_1.default.paginationNavControl, children: (0, jsx_runtime_1.jsx)(Button_1.Button, { variant: Button_1.ButtonVariant.plain, isDisabled: isDisabled || page === lastPage, "aria-label": toNextPageAriaLabel, "data-action": "next", onClick: (event) => {
                            const newPage = page + 1 <= lastPage ? page + 1 : lastPage;
                            onNextClick(event, newPage);
                            this.handleNewPage(event, newPage);
                            this.setState({ userInputPage: newPage });
                        }, icon: (0, jsx_runtime_1.jsx)(angle_right_icon_1.default, {}) }) }), !isCompact && ((0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(pagination_1.default.paginationNavControl, pagination_1.default.modifiers.last), children: (0, jsx_runtime_1.jsx)(Button_1.Button, { variant: Button_1.ButtonVariant.plain, isDisabled: isDisabled || page === lastPage, "aria-label": toLastPageAriaLabel, "data-action": "last", onClick: (event) => {
                            onLastClick(event, lastPage);
                            this.handleNewPage(event, lastPage);
                            this.setState({ userInputPage: lastPage });
                        }, icon: (0, jsx_runtime_1.jsx)(angle_double_right_icon_1.default, {}) }) }))] })));
    }
}
exports.PaginationNavigation = PaginationNavigation;
PaginationNavigation.displayName = 'PaginationNavigation';
PaginationNavigation.defaultProps = {
    className: '',
    isDisabled: false,
    isCompact: false,
    lastPage: 0,
    firstPage: 0,
    pagesTitle: '',
    pagesTitlePlural: '',
    toLastPageAriaLabel: 'Go to last page',
    toNextPageAriaLabel: 'Go to next page',
    toFirstPageAriaLabel: 'Go to first page',
    toPreviousPageAriaLabel: 'Go to previous page',
    currPageAriaLabel: 'Current page',
    paginationAriaLabel: 'Pagination',
    ofWord: 'of',
    onNextClick: () => undefined,
    onPreviousClick: () => undefined,
    onFirstClick: () => undefined,
    onLastClick: () => undefined,
    onPageInput: () => undefined
};
//# sourceMappingURL=PaginationNavigation.js.map