"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Pagination = exports.PaginationVariant = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const ToggleTemplate_1 = require("./ToggleTemplate");
const pagination_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Pagination/pagination"));
const react_styles_1 = require("@patternfly/react-styles");
const helpers_1 = require("../../helpers");
const PaginationNavigation_1 = require("./PaginationNavigation");
const PaginationOptionsMenu_1 = require("./PaginationOptionsMenu");
const helpers_2 = require("../../helpers");
const util_1 = require("../../helpers/util");
const c_pagination__nav_page_select_c_form_control_width_chars_1 = tslib_1.__importDefault(require('@patternfly/react-tokens/dist/js/c_pagination__nav_page_select_c_form_control_width_chars'));
var PaginationVariant;
(function (PaginationVariant) {
    PaginationVariant["bottom"] = "bottom";
    PaginationVariant["top"] = "top";
})(PaginationVariant || (exports.PaginationVariant = PaginationVariant = {}));
const defaultPerPageOptions = [
    {
        title: '10',
        value: 10
    },
    {
        title: '20',
        value: 20
    },
    {
        title: '50',
        value: 50
    },
    {
        title: '100',
        value: 100
    }
];
const handleInputWidth = (lastPage, node) => {
    if (!node) {
        return;
    }
    const len = String(lastPage).length;
    if (len >= 3) {
        node.style.setProperty(c_pagination__nav_page_select_c_form_control_width_chars_1.default.name, `${len}`);
    }
    else {
        node.style.setProperty(c_pagination__nav_page_select_c_form_control_width_chars_1.default.name, '2');
    }
};
const Pagination = (_a) => {
    var { children, className = '', variant = PaginationVariant.top, isDisabled = false, isCompact = false, isSticky = false, isStatic = false, dropDirection: dropDirectionProp, toggleTemplate, perPage = defaultPerPageOptions[0].value, titles = {
        items: '',
        page: '',
        pages: '',
        itemsPerPage: 'Items per page',
        perPageSuffix: 'per page',
        toFirstPageAriaLabel: 'Go to first page',
        toPreviousPageAriaLabel: 'Go to previous page',
        toLastPageAriaLabel: 'Go to last page',
        toNextPageAriaLabel: 'Go to next page',
        optionsToggleAriaLabel: '',
        currPageAriaLabel: 'Current page',
        paginationAriaLabel: 'Pagination',
        ofWord: 'of'
    }, firstPage = 1, page: pageProp = 1, offset = null, isLastFullPageShown = false, itemsStart = null, itemsEnd = null, itemCount, perPageOptions = defaultPerPageOptions, widgetId = 'options-menu', onSetPage = () => undefined, onPerPageSelect = () => undefined, onFirstClick = () => undefined, onPreviousClick = () => undefined, onNextClick = () => undefined, onPageInput = () => undefined, onLastClick = () => undefined, ouiaId, ouiaSafe = true, usePageInsets, inset, menuAppendTo } = _a, props = tslib_1.__rest(_a, ["children", "className", "variant", "isDisabled", "isCompact", "isSticky", "isStatic", "dropDirection", "toggleTemplate", "perPage", "titles", "firstPage", "page", "offset", "isLastFullPageShown", "itemsStart", "itemsEnd", "itemCount", "perPageOptions", "widgetId", "onSetPage", "onPerPageSelect", "onFirstClick", "onPreviousClick", "onNextClick", "onPageInput", "onLastClick", "ouiaId", "ouiaSafe", "usePageInsets", "inset", "menuAppendTo"]);
    const paginationRef = (0, react_1.useRef)(null);
    const containerRef = (0, react_1.useRef)(null);
    const getLastPage = () => 
    // when itemCount is not known let's set lastPage as page+1 as we don't know the total count
    itemCount || itemCount === 0 ? Math.ceil(itemCount / perPage) || 0 : page + 1;
    (0, react_1.useEffect)(() => {
        const node = paginationRef.current;
        handleInputWidth(getLastPage(), node);
    }, [perPage, itemCount]);
    const dropDirection = dropDirectionProp || (variant === 'bottom' && !isStatic ? 'up' : 'down');
    let page = pageProp;
    if (offset !== null) {
        itemsStart = offset + 1;
        page = Math.max(Math.ceil(itemsStart / perPage), 1);
        itemsEnd = offset + perPage;
    }
    const lastPage = getLastPage();
    let firstIndex = (page - 1) * perPage + 1;
    let lastIndex = page * perPage;
    if (itemCount || itemCount === 0) {
        firstIndex = itemCount <= 0 ? 0 : (page - 1) * perPage + 1;
        if (page < firstPage && itemCount > 0) {
            page = firstPage;
        }
        else if (page > lastPage) {
            page = lastPage;
        }
        if (itemCount >= 0) {
            lastIndex = page === lastPage || itemCount === 0 ? itemCount : page * perPage;
        }
    }
    const PaginationToggleTemplateProps = {
        firstIndex,
        lastIndex,
        itemCount,
        itemsTitle: titles.items,
        ofWord: titles.ofWord
    };
    return ((0, jsx_runtime_1.jsxs)("div", Object.assign({ ref: paginationRef, className: (0, react_styles_1.css)(pagination_1.default.pagination, variant === PaginationVariant.bottom && pagination_1.default.modifiers.bottom, usePageInsets && pagination_1.default.modifiers.pageInsets, (0, util_1.formatBreakpointMods)(inset, pagination_1.default), isStatic && pagination_1.default.modifiers.static, isSticky && pagination_1.default.modifiers.sticky, className) }, (widgetId && { id: `${widgetId}-${variant}-pagination` }), (0, helpers_2.useOUIAProps)(exports.Pagination.displayName, ouiaId, ouiaSafe, variant), props, { children: [variant === PaginationVariant.top && ((0, jsx_runtime_1.jsxs)("div", { className: (0, react_styles_1.css)(pagination_1.default.paginationTotalItems), children: [toggleTemplate &&
                        typeof toggleTemplate === 'string' &&
                        (0, helpers_1.fillTemplate)(toggleTemplate, PaginationToggleTemplateProps), toggleTemplate &&
                        typeof toggleTemplate !== 'string' &&
                        toggleTemplate(PaginationToggleTemplateProps), !toggleTemplate && ((0, jsx_runtime_1.jsx)(ToggleTemplate_1.ToggleTemplate, { firstIndex: firstIndex, lastIndex: lastIndex, itemCount: itemCount, itemsTitle: titles.items, ofWord: titles.ofWord }))] })), perPageOptions && perPageOptions.length > 0 && ((0, jsx_runtime_1.jsx)(PaginationOptionsMenu_1.PaginationOptionsMenu, { itemsPerPageTitle: titles.itemsPerPage, perPageSuffix: titles.perPageSuffix, itemsTitle: isCompact ? '' : titles.items, optionsToggleAriaLabel: titles.optionsToggleAriaLabel, perPageOptions: perPageOptions, firstIndex: itemsStart !== null ? itemsStart : firstIndex, lastIndex: itemsEnd !== null ? itemsEnd : lastIndex, ofWord: titles.ofWord, isLastFullPageShown: isLastFullPageShown, itemCount: itemCount, page: page, perPage: perPage, lastPage: lastPage, onPerPageSelect: onPerPageSelect, dropDirection: dropDirection, widgetId: `${widgetId}-${variant}`, toggleTemplate: toggleTemplate, isDisabled: isDisabled, containerRef: containerRef, appendTo: menuAppendTo })), (0, jsx_runtime_1.jsx)(PaginationNavigation_1.PaginationNavigation, { pagesTitle: titles.page, pagesTitlePlural: titles.pages, toLastPageAriaLabel: titles.toLastPageAriaLabel, toPreviousPageAriaLabel: titles.toPreviousPageAriaLabel, toNextPageAriaLabel: titles.toNextPageAriaLabel, toFirstPageAriaLabel: titles.toFirstPageAriaLabel, currPageAriaLabel: titles.currPageAriaLabel, paginationAriaLabel: titles.paginationAriaLabel, ofWord: titles.ofWord, page: itemCount && itemCount <= 0 ? 0 : page, perPage: perPage, itemCount: itemCount, firstPage: itemsStart !== null ? itemsStart : 1, lastPage: lastPage, onSetPage: onSetPage, onFirstClick: onFirstClick, onPreviousClick: onPreviousClick, onNextClick: onNextClick, onLastClick: onLastClick, onPageInput: onPageInput, isDisabled: isDisabled, isCompact: isCompact }), children] })));
};
exports.Pagination = Pagination;
exports.Pagination.displayName = 'Pagination';
//# sourceMappingURL=Pagination.js.map