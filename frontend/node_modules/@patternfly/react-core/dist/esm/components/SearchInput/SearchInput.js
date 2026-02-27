import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { forwardRef, useEffect, useRef, useState } from 'react';
import { css } from '@patternfly/react-styles';
import { Button, ButtonVariant } from '../Button';
import { Badge } from '../Badge';
import { Icon } from '../Icon';
import AngleDownIcon from '@patternfly/react-icons/dist/esm/icons/angle-down-icon';
import AngleUpIcon from '@patternfly/react-icons/dist/esm/icons/angle-up-icon';
import TimesIcon from '@patternfly/react-icons/dist/esm/icons/times-icon';
import SearchIcon from '@patternfly/react-icons/dist/esm/icons/search-icon';
import CaretDownIcon from '@patternfly/react-icons/dist/esm/icons/caret-down-icon';
import ArrowRightIcon from '@patternfly/react-icons/dist/esm/icons/arrow-right-icon';
import { AdvancedSearchMenu } from './AdvancedSearchMenu';
import { TextInputGroup, TextInputGroupMain, TextInputGroupUtilities } from '../TextInputGroup';
import { InputGroup, InputGroupItem } from '../InputGroup';
import { Popper } from '../../helpers';
import { useHasAnimations } from '../../helpers';
import textInputGroupStyles from '@patternfly/react-styles/css/components/TextInputGroup/text-input-group.mjs';
import inputGroupStyles from '@patternfly/react-styles/css/components/InputGroup/input-group.mjs';
const SearchInputBase = (_a) => {
    var { className, searchInputId, value = '', attributes = [], formAdditionalItems, hasWordsAttrLabel = 'Has words', advancedSearchDelimiter, placeholder, hint, onChange, onSearch, onClear, onToggleAdvancedSearch, isAdvancedSearchOpen = false, resultsCount, resultsCountContext = ' results', onNextClick, onPreviousClick, innerRef, expandableInput, 'aria-label': ariaLabel = 'Search input', resetButtonLabel = 'Reset', openMenuButtonAriaLabel = 'Open advanced search', previousNavigationButtonAriaLabel = 'Previous', isPreviousNavigationButtonDisabled = false, isNextNavigationButtonDisabled = false, nextNavigationButtonAriaLabel = 'Next', submitSearchButtonLabel = 'Search', isDisabled = false, appendTo, zIndex = 9999, name, areUtilitiesDisplayed, inputProps } = _a, props = __rest(_a, ["className", "searchInputId", "value", "attributes", "formAdditionalItems", "hasWordsAttrLabel", "advancedSearchDelimiter", "placeholder", "hint", "onChange", "onSearch", "onClear", "onToggleAdvancedSearch", "isAdvancedSearchOpen", "resultsCount", "resultsCountContext", "onNextClick", "onPreviousClick", "innerRef", "expandableInput", 'aria-label', "resetButtonLabel", "openMenuButtonAriaLabel", "previousNavigationButtonAriaLabel", "isPreviousNavigationButtonDisabled", "isNextNavigationButtonDisabled", "nextNavigationButtonAriaLabel", "submitSearchButtonLabel", "isDisabled", "appendTo", "zIndex", "name", "areUtilitiesDisplayed", "inputProps"]);
    const [isSearchMenuOpen, setIsSearchMenuOpen] = useState(false);
    const [searchValue, setSearchValue] = useState(value);
    const searchInputRef = useRef(null);
    const ref = useRef(null);
    const searchInputInputRef = innerRef || ref;
    const searchInputExpandableToggleRef = useRef(null);
    const triggerRef = useRef(null);
    const popperRef = useRef(null);
    const [focusAfterExpandChange, setFocusAfterExpandChange] = useState(false);
    const { isExpanded, onToggleExpand, toggleAriaLabel, hasAnimations: hasAnimationsProp } = expandableInput || {};
    const hasAnimations = useHasAnimations(hasAnimationsProp);
    useEffect(() => {
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
    useEffect(() => {
        setSearchValue(value);
    }, [value]);
    useEffect(() => {
        if (attributes.length > 0 && !advancedSearchDelimiter) {
            // eslint-disable-next-line no-console
            console.error('An advancedSearchDelimiter prop is required when advanced search attributes are provided using the attributes prop');
        }
    });
    useEffect(() => {
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
        var searchInputProps = __rest(_a, []);
        return (_jsxs(TextInputGroup, Object.assign({ isDisabled: isDisabled }, searchInputProps, { children: [_jsx(TextInputGroupMain, { hint: hint, icon: _jsx(SearchIcon, {}), innerRef: searchInputInputRef, value: searchValue, placeholder: placeholder, "aria-label": ariaLabel, onKeyDown: onEnter, onChange: onChangeHandler, name: name, inputId: searchInputId, inputProps: inputProps }), (renderUtilities || areUtilitiesDisplayed) && (_jsxs(TextInputGroupUtilities, { children: [resultsCount && (_jsx(Badge, { isRead: true, screenReaderText: resultsCountContext, children: resultsCount })), !!onNextClick && !!onPreviousClick && (_jsxs("div", { className: textInputGroupStyles.textInputGroupGroup, children: [_jsx(Button, { variant: ButtonVariant.plain, "aria-label": previousNavigationButtonAriaLabel, isDisabled: isDisabled || isPreviousNavigationButtonDisabled, onClick: onPreviousClick, icon: _jsx(AngleUpIcon, {}) }), _jsx(Button, { variant: ButtonVariant.plain, "aria-label": nextNavigationButtonAriaLabel, isDisabled: isDisabled || isNextNavigationButtonDisabled, onClick: onNextClick, icon: _jsx(AngleDownIcon, {}) })] })), !!onClear && !expandableInput && (_jsx(Button, { variant: ButtonVariant.plain, isDisabled: isDisabled, "aria-label": resetButtonLabel, onClick: onClearInput, icon: _jsx(TimesIcon, {}) }))] }))] })));
    };
    const expandToggleButton = (_jsx(Button, { variant: ButtonVariant.plain, "aria-label": toggleAriaLabel, "aria-expanded": isExpanded, icon: _jsx(SearchIcon, {}), onClick: onExpandHandler, ref: searchInputExpandableToggleRef }));
    const collapseToggleButton = (_jsx(Button, { variant: ButtonVariant.plain, "aria-label": toggleAriaLabel, "aria-expanded": isExpanded, icon: _jsx(TimesIcon, {}), onClick: onExpandHandler }));
    const singleButtonToggle = (_jsx(Button, { variant: ButtonVariant.plain, "aria-label": toggleAriaLabel, "aria-expanded": isExpanded, icon: isExpanded ? _jsx(TimesIcon, {}) : _jsx(SearchIcon, {}), onClick: onExpandHandler, ref: searchInputExpandableToggleRef }));
    const onTransitionEnd = () => {
        var _a;
        !isExpanded && focusAfterExpandChange && ((_a = searchInputExpandableToggleRef === null || searchInputExpandableToggleRef === void 0 ? void 0 : searchInputExpandableToggleRef.current) === null || _a === void 0 ? void 0 : _a.focus());
        setFocusAfterExpandChange(false);
    };
    const expandableToggle = (_jsxs(_Fragment, { children: [!hasAnimations && _jsx(InputGroupItem, { isPlain: true, children: singleButtonToggle }), hasAnimations && (_jsxs(_Fragment, { children: [_jsx(InputGroupItem, Object.assign({ className: inputGroupStyles.modifiers.searchExpand, isPlain: true, onTransitionEnd: onTransitionEnd }, (isExpanded && { inert: '' }), { children: expandToggleButton })), _jsx(InputGroupItem, Object.assign({ className: inputGroupStyles.modifiers.searchAction, isPlain: true }, (!isExpanded && { inert: '' }), { children: collapseToggleButton }))] }))] }));
    const buildExpandableSearchInput = (_a = {}) => {
        var searchInputProps = __rest(_a, []);
        return (_jsxs(InputGroup, Object.assign({}, searchInputProps, { children: [_jsx(InputGroupItem, Object.assign({}, (!hasAnimations && { isFill: true }), (hasAnimations && { className: inputGroupStyles.modifiers.searchInput }), (!isExpanded && {
                    inert: ''
                }), { children: buildTextInputGroup() })), expandableToggle] })));
    };
    const buildSearchTextInputGroup = (_a = {}) => {
        var searchInputProps = __rest(_a, []);
        if (expandableInput) {
            return buildExpandableSearchInput(Object.assign({}, searchInputProps));
        }
        return buildTextInputGroup(Object.assign({}, searchInputProps));
    };
    const buildSearchTextInputGroupWithExtraButtons = (_a = {}) => {
        var searchInputProps = __rest(_a, []);
        return (_jsxs(InputGroup, Object.assign({ ref: triggerRef }, searchInputProps, { children: [_jsx(InputGroupItem, Object.assign({}, (!hasAnimations && { isFill: true }), (expandableInput && hasAnimations && { className: inputGroupStyles.modifiers.searchInput }), (expandableInput &&
                    hasAnimations &&
                    !isExpanded && {
                    inert: ''
                }), { children: buildTextInputGroup() })), (attributes.length > 0 || onToggleAdvancedSearch) && (_jsx(InputGroupItem, Object.assign({ isPlain: true }, (hasAnimations && { className: inputGroupStyles.modifiers.searchAction }), { children: _jsx(Button, { className: isSearchMenuOpen && 'pf-m-expanded', variant: ButtonVariant.control, "aria-label": openMenuButtonAriaLabel, onClick: onToggle, isDisabled: isDisabled, "aria-expanded": isSearchMenuOpen, icon: _jsx(CaretDownIcon, {}) }) }))), !!onSearch && (_jsx(InputGroupItem, Object.assign({}, (hasAnimations && { className: inputGroupStyles.modifiers.searchAction }), { children: _jsx(Button, { type: "submit", variant: ButtonVariant.control, "aria-label": submitSearchButtonLabel, onClick: onSearchHandler, isDisabled: isDisabled, icon: _jsx(Icon, { shouldMirrorRTL: true, children: _jsx(ArrowRightIcon, {}) }) }) }))), expandableInput && _jsx(InputGroupItem, { children: expandableToggle })] })));
    };
    const searchInputProps = Object.assign(Object.assign({}, props), { className: css(expandableInput && hasAnimations && inputGroupStyles.modifiers.searchExpandable, expandableInput && hasAnimations && isExpanded && inputGroupStyles.modifiers.expanded, className && css(className)), innerRef: searchInputRef });
    if (!!expandableInput && !isExpanded && !hasAnimations) {
        return (_jsx(InputGroup, Object.assign({}, searchInputProps, { children: _jsx(InputGroupItem, { children: expandableToggle }) })));
    }
    if (!!onSearch || attributes.length > 0 || !!onToggleAdvancedSearch) {
        if (attributes.length > 0) {
            const AdvancedSearch = (_jsx("div", { ref: popperRef, children: _jsx(AdvancedSearchMenu, { value: value, parentRef: searchInputRef, parentInputRef: searchInputInputRef, onSearch: onSearch, onClear: onClear, onChange: onChange, onToggleAdvancedMenu: onToggle, resetButtonLabel: resetButtonLabel, submitSearchButtonLabel: submitSearchButtonLabel, attributes: attributes, formAdditionalItems: formAdditionalItems, hasWordsAttrLabel: hasWordsAttrLabel, advancedSearchDelimiter: advancedSearchDelimiter, getAttrValueMap: getAttrValueMap, isSearchMenuOpen: isSearchMenuOpen }) }));
            const advancedSearchInputProps = hasAnimations
                ? {
                    className: css(expandableInput && inputGroupStyles.modifiers.searchExpandable, expandableInput && isExpanded && inputGroupStyles.modifiers.expanded)
                }
                : {};
            const AdvancedSearchWithPopper = (_jsx("div", Object.assign({ className: css(className), ref: searchInputRef }, props, { children: _jsx(Popper, { trigger: buildSearchTextInputGroupWithExtraButtons(advancedSearchInputProps), triggerRef: triggerRef, popper: AdvancedSearch, popperRef: popperRef, isVisible: isSearchMenuOpen, enableFlip: true, appendTo: () => appendTo || searchInputRef.current, zIndex: zIndex }) })));
            const AdvancedSearchInline = (_jsxs("div", Object.assign({ className: css(className), ref: searchInputRef }, props, { children: [buildSearchTextInputGroupWithExtraButtons(advancedSearchInputProps), AdvancedSearch] })));
            return appendTo !== 'inline' ? AdvancedSearchWithPopper : AdvancedSearchInline;
        }
        return buildSearchTextInputGroupWithExtraButtons(Object.assign({}, searchInputProps));
    }
    return buildSearchTextInputGroup(searchInputProps);
};
SearchInputBase.displayName = 'SearchInputBase';
export const SearchInput = forwardRef((props, ref) => (_jsx(SearchInputBase, Object.assign({}, props, { innerRef: ref }))));
SearchInput.displayName = 'SearchInput';
//# sourceMappingURL=SearchInput.js.map