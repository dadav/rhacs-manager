"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchInput = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_styles_1 = require("@patternfly/react-styles");
const Button_1 = require("../Button");
const Badge_1 = require("../Badge");
const Icon_1 = require("../Icon");
const angle_down_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/angle-down-icon'));
const angle_up_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/angle-up-icon'));
const times_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/times-icon'));
const search_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/search-icon'));
const caret_down_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/caret-down-icon'));
const arrow_right_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/arrow-right-icon'));
const AdvancedSearchMenu_1 = require("./AdvancedSearchMenu");
const TextInputGroup_1 = require("../TextInputGroup");
const InputGroup_1 = require("../InputGroup");
const helpers_1 = require("../../helpers");
const helpers_2 = require("../../helpers");
const text_input_group_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/TextInputGroup/text-input-group"));
const input_group_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/InputGroup/input-group"));
const SearchInputBase = (_a) => {
    var { className, searchInputId, value = '', attributes = [], formAdditionalItems, hasWordsAttrLabel = 'Has words', advancedSearchDelimiter, placeholder, hint, onChange, onSearch, onClear, onToggleAdvancedSearch, isAdvancedSearchOpen = false, resultsCount, resultsCountContext = ' results', onNextClick, onPreviousClick, innerRef, expandableInput, 'aria-label': ariaLabel = 'Search input', resetButtonLabel = 'Reset', openMenuButtonAriaLabel = 'Open advanced search', previousNavigationButtonAriaLabel = 'Previous', isPreviousNavigationButtonDisabled = false, isNextNavigationButtonDisabled = false, nextNavigationButtonAriaLabel = 'Next', submitSearchButtonLabel = 'Search', isDisabled = false, appendTo, zIndex = 9999, name, areUtilitiesDisplayed, inputProps } = _a, props = tslib_1.__rest(_a, ["className", "searchInputId", "value", "attributes", "formAdditionalItems", "hasWordsAttrLabel", "advancedSearchDelimiter", "placeholder", "hint", "onChange", "onSearch", "onClear", "onToggleAdvancedSearch", "isAdvancedSearchOpen", "resultsCount", "resultsCountContext", "onNextClick", "onPreviousClick", "innerRef", "expandableInput", 'aria-label', "resetButtonLabel", "openMenuButtonAriaLabel", "previousNavigationButtonAriaLabel", "isPreviousNavigationButtonDisabled", "isNextNavigationButtonDisabled", "nextNavigationButtonAriaLabel", "submitSearchButtonLabel", "isDisabled", "appendTo", "zIndex", "name", "areUtilitiesDisplayed", "inputProps"]);
    const [isSearchMenuOpen, setIsSearchMenuOpen] = (0, react_1.useState)(false);
    const [searchValue, setSearchValue] = (0, react_1.useState)(value);
    const searchInputRef = (0, react_1.useRef)(null);
    const ref = (0, react_1.useRef)(null);
    const searchInputInputRef = innerRef || ref;
    const searchInputExpandableToggleRef = (0, react_1.useRef)(null);
    const triggerRef = (0, react_1.useRef)(null);
    const popperRef = (0, react_1.useRef)(null);
    const [focusAfterExpandChange, setFocusAfterExpandChange] = (0, react_1.useState)(false);
    const { isExpanded, onToggleExpand, toggleAriaLabel, hasAnimations: hasAnimationsProp } = expandableInput || {};
    const hasAnimations = (0, helpers_2.useHasAnimations)(hasAnimationsProp);
    (0, react_1.useEffect)(() => {
        var _a, _b;
        // this effect and the focusAfterExpandChange variable are needed to focus the input/toggle as needed when the
        // expansion toggle is fired without focusing on mount
        if (!focusAfterExpandChange) {
            return;
        }
        else if (isExpanded) {
            (_a = searchInputInputRef === null || searchInputInputRef === void 0 ? void 0 : searchInputInputRef.current) === null || _a === void 0 ? void 0 : _a.focus();
        }
        else {
            if (!hasAnimations) {
                (_b = searchInputExpandableToggleRef === null || searchInputExpandableToggleRef === void 0 ? void 0 : searchInputExpandableToggleRef.current) === null || _b === void 0 ? void 0 : _b.focus();
            }
        }
        if (!hasAnimations) {
            setFocusAfterExpandChange(false);
        }
    }, [focusAfterExpandChange, isExpanded, searchInputInputRef, searchInputExpandableToggleRef]);
    (0, react_1.useEffect)(() => {
        setSearchValue(value);
    }, [value]);
    (0, react_1.useEffect)(() => {
        if (attributes.length > 0 && !advancedSearchDelimiter) {
            // eslint-disable-next-line no-console
            console.error('An advancedSearchDelimiter prop is required when advanced search attributes are provided using the attributes prop');
        }
    });
    (0, react_1.useEffect)(() => {
        setIsSearchMenuOpen(isAdvancedSearchOpen);
    }, [isAdvancedSearchOpen]);
    const onChangeHandler = (event, value) => {
        if (onChange) {
            onChange(event, value);
        }
        setSearchValue(value);
    };
    const onToggle = (e) => {
        const isOpen = !isSearchMenuOpen;
        setIsSearchMenuOpen(isOpen);
        if (onToggleAdvancedSearch) {
            onToggleAdvancedSearch(e, isOpen);
        }
    };
    const onSearchHandler = (event) => {
        event.preventDefault();
        if (onSearch) {
            onSearch(event, value, getAttrValueMap());
        }
        setIsSearchMenuOpen(false);
    };
    const splitStringExceptInQuotes = (str) => {
        let quoteType;
        return str.match(/\\?.|^$/g).reduce((p, c) => {
            if (c === "'" || c === '"') {
                if (!quoteType) {
                    quoteType = c;
                }
                if (c === quoteType) {
                    p.quote = !p.quote;
                }
            }
            else if (!p.quote && c === ' ') {
                p.a.push('');
            }
            else {
                p.a[p.a.length - 1] += c.replace(/\\(.)/, '$1');
            }
            return p;
        }, { a: [''] }).a;
    };
    const getAttrValueMap = () => {
        const attrValue = {};
        const pairs = splitStringExceptInQuotes(searchValue);
        pairs.map((pair) => {
            const splitPair = pair.split(advancedSearchDelimiter);
            if (splitPair.length === 2) {
                attrValue[splitPair[0]] = splitPair[1].replace(/(^'|'$)/g, '');
            }
            else if (splitPair.length === 1) {
                attrValue.haswords = attrValue.hasOwnProperty('haswords')
                    ? `${attrValue.haswords} ${splitPair[0]}`
                    : splitPair[0];
            }
        });
        return attrValue;
    };
    const onEnter = (event) => {
        if (event.key === 'Enter') {
            onSearchHandler(event);
        }
    };
    const onClearInput = (e) => {
        if (onClear) {
            onClear(e);
        }
        if (searchInputInputRef && searchInputInputRef.current) {
            searchInputInputRef.current.focus();
        }
    };
    const onExpandHandler = (event) => {
        setSearchValue('');
        onToggleExpand(event, isExpanded);
        setFocusAfterExpandChange(true);
    };
    const renderUtilities = value && (resultsCount || (!!onNextClick && !!onPreviousClick) || (!!onClear && !expandableInput));
    const buildTextInputGroup = (_a = {}) => {
        var searchInputProps = tslib_1.__rest(_a, []);
        return ((0, jsx_runtime_1.jsxs)(TextInputGroup_1.TextInputGroup, Object.assign({ isDisabled: isDisabled }, searchInputProps, { children: [(0, jsx_runtime_1.jsx)(TextInputGroup_1.TextInputGroupMain, { hint: hint, icon: (0, jsx_runtime_1.jsx)(search_icon_1.default, {}), innerRef: searchInputInputRef, value: searchValue, placeholder: placeholder, "aria-label": ariaLabel, onKeyDown: onEnter, onChange: onChangeHandler, name: name, inputId: searchInputId, inputProps: inputProps }), (renderUtilities || areUtilitiesDisplayed) && ((0, jsx_runtime_1.jsxs)(TextInputGroup_1.TextInputGroupUtilities, { children: [resultsCount && ((0, jsx_runtime_1.jsx)(Badge_1.Badge, { isRead: true, screenReaderText: resultsCountContext, children: resultsCount })), !!onNextClick && !!onPreviousClick && ((0, jsx_runtime_1.jsxs)("div", { className: text_input_group_1.default.textInputGroupGroup, children: [(0, jsx_runtime_1.jsx)(Button_1.Button, { variant: Button_1.ButtonVariant.plain, "aria-label": previousNavigationButtonAriaLabel, isDisabled: isDisabled || isPreviousNavigationButtonDisabled, onClick: onPreviousClick, icon: (0, jsx_runtime_1.jsx)(angle_up_icon_1.default, {}) }), (0, jsx_runtime_1.jsx)(Button_1.Button, { variant: Button_1.ButtonVariant.plain, "aria-label": nextNavigationButtonAriaLabel, isDisabled: isDisabled || isNextNavigationButtonDisabled, onClick: onNextClick, icon: (0, jsx_runtime_1.jsx)(angle_down_icon_1.default, {}) })] })), !!onClear && !expandableInput && ((0, jsx_runtime_1.jsx)(Button_1.Button, { variant: Button_1.ButtonVariant.plain, isDisabled: isDisabled, "aria-label": resetButtonLabel, onClick: onClearInput, icon: (0, jsx_runtime_1.jsx)(times_icon_1.default, {}) }))] }))] })));
    };
    const expandToggleButton = ((0, jsx_runtime_1.jsx)(Button_1.Button, { variant: Button_1.ButtonVariant.plain, "aria-label": toggleAriaLabel, "aria-expanded": isExpanded, icon: (0, jsx_runtime_1.jsx)(search_icon_1.default, {}), onClick: onExpandHandler, ref: searchInputExpandableToggleRef }));
    const collapseToggleButton = ((0, jsx_runtime_1.jsx)(Button_1.Button, { variant: Button_1.ButtonVariant.plain, "aria-label": toggleAriaLabel, "aria-expanded": isExpanded, icon: (0, jsx_runtime_1.jsx)(times_icon_1.default, {}), onClick: onExpandHandler }));
    const singleButtonToggle = ((0, jsx_runtime_1.jsx)(Button_1.Button, { variant: Button_1.ButtonVariant.plain, "aria-label": toggleAriaLabel, "aria-expanded": isExpanded, icon: isExpanded ? (0, jsx_runtime_1.jsx)(times_icon_1.default, {}) : (0, jsx_runtime_1.jsx)(search_icon_1.default, {}), onClick: onExpandHandler, ref: searchInputExpandableToggleRef }));
    const onTransitionEnd = () => {
        var _a;
        !isExpanded && focusAfterExpandChange && ((_a = searchInputExpandableToggleRef === null || searchInputExpandableToggleRef === void 0 ? void 0 : searchInputExpandableToggleRef.current) === null || _a === void 0 ? void 0 : _a.focus());
        setFocusAfterExpandChange(false);
    };
    const expandableToggle = ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [!hasAnimations && (0, jsx_runtime_1.jsx)(InputGroup_1.InputGroupItem, { isPlain: true, children: singleButtonToggle }), hasAnimations && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(InputGroup_1.InputGroupItem, Object.assign({ className: input_group_1.default.modifiers.searchExpand, isPlain: true, onTransitionEnd: onTransitionEnd }, (isExpanded && { inert: '' }), { children: expandToggleButton })), (0, jsx_runtime_1.jsx)(InputGroup_1.InputGroupItem, Object.assign({ className: input_group_1.default.modifiers.searchAction, isPlain: true }, (!isExpanded && { inert: '' }), { children: collapseToggleButton }))] }))] }));
    const buildExpandableSearchInput = (_a = {}) => {
        var searchInputProps = tslib_1.__rest(_a, []);
        return ((0, jsx_runtime_1.jsxs)(InputGroup_1.InputGroup, Object.assign({}, searchInputProps, { children: [(0, jsx_runtime_1.jsx)(InputGroup_1.InputGroupItem, Object.assign({}, (!hasAnimations && { isFill: true }), (hasAnimations && { className: input_group_1.default.modifiers.searchInput }), (!isExpanded && {
                    inert: ''
                }), { children: buildTextInputGroup() })), expandableToggle] })));
    };
    const buildSearchTextInputGroup = (_a = {}) => {
        var searchInputProps = tslib_1.__rest(_a, []);
        if (expandableInput) {
            return buildExpandableSearchInput(Object.assign({}, searchInputProps));
        }
        return buildTextInputGroup(Object.assign({}, searchInputProps));
    };
    const buildSearchTextInputGroupWithExtraButtons = (_a = {}) => {
        var searchInputProps = tslib_1.__rest(_a, []);
        return ((0, jsx_runtime_1.jsxs)(InputGroup_1.InputGroup, Object.assign({ ref: triggerRef }, searchInputProps, { children: [(0, jsx_runtime_1.jsx)(InputGroup_1.InputGroupItem, Object.assign({}, (!hasAnimations && { isFill: true }), (expandableInput && hasAnimations && { className: input_group_1.default.modifiers.searchInput }), (expandableInput &&
                    hasAnimations &&
                    !isExpanded && {
                    inert: ''
                }), { children: buildTextInputGroup() })), (attributes.length > 0 || onToggleAdvancedSearch) && ((0, jsx_runtime_1.jsx)(InputGroup_1.InputGroupItem, Object.assign({ isPlain: true }, (hasAnimations && { className: input_group_1.default.modifiers.searchAction }), { children: (0, jsx_runtime_1.jsx)(Button_1.Button, { className: isSearchMenuOpen && 'pf-m-expanded', variant: Button_1.ButtonVariant.control, "aria-label": openMenuButtonAriaLabel, onClick: onToggle, isDisabled: isDisabled, "aria-expanded": isSearchMenuOpen, icon: (0, jsx_runtime_1.jsx)(caret_down_icon_1.default, {}) }) }))), !!onSearch && ((0, jsx_runtime_1.jsx)(InputGroup_1.InputGroupItem, Object.assign({}, (hasAnimations && { className: input_group_1.default.modifiers.searchAction }), { children: (0, jsx_runtime_1.jsx)(Button_1.Button, { type: "submit", variant: Button_1.ButtonVariant.control, "aria-label": submitSearchButtonLabel, onClick: onSearchHandler, isDisabled: isDisabled, icon: (0, jsx_runtime_1.jsx)(Icon_1.Icon, { shouldMirrorRTL: true, children: (0, jsx_runtime_1.jsx)(arrow_right_icon_1.default, {}) }) }) }))), expandableInput && (0, jsx_runtime_1.jsx)(InputGroup_1.InputGroupItem, { children: expandableToggle })] })));
    };
    const searchInputProps = Object.assign(Object.assign({}, props), { className: (0, react_styles_1.css)(expandableInput && hasAnimations && input_group_1.default.modifiers.searchExpandable, expandableInput && hasAnimations && isExpanded && input_group_1.default.modifiers.expanded, className && (0, react_styles_1.css)(className)), innerRef: searchInputRef });
    if (!!expandableInput && !isExpanded && !hasAnimations) {
        return ((0, jsx_runtime_1.jsx)(InputGroup_1.InputGroup, Object.assign({}, searchInputProps, { children: (0, jsx_runtime_1.jsx)(InputGroup_1.InputGroupItem, { children: expandableToggle }) })));
    }
    if (!!onSearch || attributes.length > 0 || !!onToggleAdvancedSearch) {
        if (attributes.length > 0) {
            const AdvancedSearch = ((0, jsx_runtime_1.jsx)("div", { ref: popperRef, children: (0, jsx_runtime_1.jsx)(AdvancedSearchMenu_1.AdvancedSearchMenu, { value: value, parentRef: searchInputRef, parentInputRef: searchInputInputRef, onSearch: onSearch, onClear: onClear, onChange: onChange, onToggleAdvancedMenu: onToggle, resetButtonLabel: resetButtonLabel, submitSearchButtonLabel: submitSearchButtonLabel, attributes: attributes, formAdditionalItems: formAdditionalItems, hasWordsAttrLabel: hasWordsAttrLabel, advancedSearchDelimiter: advancedSearchDelimiter, getAttrValueMap: getAttrValueMap, isSearchMenuOpen: isSearchMenuOpen }) }));
            const advancedSearchInputProps = hasAnimations
                ? {
                    className: (0, react_styles_1.css)(expandableInput && input_group_1.default.modifiers.searchExpandable, expandableInput && isExpanded && input_group_1.default.modifiers.expanded)
                }
                : {};
            const AdvancedSearchWithPopper = ((0, jsx_runtime_1.jsx)("div", Object.assign({ className: (0, react_styles_1.css)(className), ref: searchInputRef }, props, { children: (0, jsx_runtime_1.jsx)(helpers_1.Popper, { trigger: buildSearchTextInputGroupWithExtraButtons(advancedSearchInputProps), triggerRef: triggerRef, popper: AdvancedSearch, popperRef: popperRef, isVisible: isSearchMenuOpen, enableFlip: true, appendTo: () => appendTo || searchInputRef.current, zIndex: zIndex }) })));
            const AdvancedSearchInline = ((0, jsx_runtime_1.jsxs)("div", Object.assign({ className: (0, react_styles_1.css)(className), ref: searchInputRef }, props, { children: [buildSearchTextInputGroupWithExtraButtons(advancedSearchInputProps), AdvancedSearch] })));
            return appendTo !== 'inline' ? AdvancedSearchWithPopper : AdvancedSearchInline;
        }
        return buildSearchTextInputGroupWithExtraButtons(Object.assign({}, searchInputProps));
    }
    return buildSearchTextInputGroup(searchInputProps);
};
SearchInputBase.displayName = 'SearchInputBase';
exports.SearchInput = (0, react_1.forwardRef)((props, ref) => ((0, jsx_runtime_1.jsx)(SearchInputBase, Object.assign({}, props, { innerRef: ref }))));
exports.SearchInput.displayName = 'SearchInput';
//# sourceMappingURL=SearchInput.js.map