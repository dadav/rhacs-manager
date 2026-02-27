import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/Pagination/pagination.mjs';
import { Menu, MenuContent, MenuList, MenuItem } from '../Menu';
import { MenuToggle } from '../MenuToggle';
import { Popper } from '../../helpers/Popper/Popper';
import { ToggleTemplate } from './ToggleTemplate';
import { fillTemplate } from '../../helpers';
export const PaginationOptionsMenu = ({ className, widgetId, page: pageProp, itemCount, isDisabled = false, minWidth, dropDirection = 'down', perPageOptions = [], 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
itemsPerPageTitle = 'Items per page', perPageSuffix = 'per page', optionsToggleAriaLabel, ofWord = 'of', perPage = 0, firstIndex = 0, lastIndex = 0, isLastFullPageShown = false, itemsTitle = '', toggleTemplate, onPerPageSelect = () => null, containerRef, appendTo, shouldPreventScrollOnItemFocus = true, focusTimeoutDelay = 0 }) => {
    const [isOpen, setIsOpen] = useState(false);
    const toggleRef = useRef(null);
    const menuRef = useRef(null);
    const onToggle = () => {
        setIsOpen((prevState) => !prevState);
    };
    const onSelect = () => {
        var _a;
        setIsOpen((prevState) => !prevState);
        (_a = toggleRef.current) === null || _a === void 0 ? void 0 : _a.focus();
    };
    const handleNewPerPage = (_evt, newPerPage) => {
        let newPage = pageProp;
        while (Math.ceil(itemCount / newPerPage) < newPage) {
            newPage--;
        }
        if (isLastFullPageShown) {
            if (itemCount / newPerPage !== newPage) {
                while (newPage > 1 && itemCount - newPerPage * newPage < 0) {
                    newPage--;
                }
            }
        }
        const startIdx = (newPage - 1) * newPerPage;
        const endIdx = newPage * newPerPage;
        return onPerPageSelect(_evt, newPerPage, newPage, startIdx, endIdx);
    };
    useEffect(() => {
        const handleMenuKeys = (event) => {
            var _a, _b, _c;
            // Close the menu on tab or escape
            if ((isOpen && ((_a = menuRef.current) === null || _a === void 0 ? void 0 : _a.contains(event.target))) ||
                ((_b = toggleRef.current) === null || _b === void 0 ? void 0 : _b.contains(event.target))) {
                if (event.key === 'Escape' || event.key === 'Tab') {
                    setIsOpen(false);
                    (_c = toggleRef.current) === null || _c === void 0 ? void 0 : _c.focus();
                }
            }
        };
        const handleClick = (event) => {
            var _a, _b, _c;
            // Focus the first non-disabled menu item on toggle 'click'
            if (isOpen && ((_a = toggleRef.current) === null || _a === void 0 ? void 0 : _a.contains(event.target))) {
                setTimeout(() => {
                    var _a;
                    const firstElement = (_a = menuRef === null || menuRef === void 0 ? void 0 : menuRef.current) === null || _a === void 0 ? void 0 : _a.querySelector('li button:not(:disabled)');
                    firstElement && firstElement.focus({ preventScroll: shouldPreventScrollOnItemFocus });
                }, focusTimeoutDelay);
            }
            // If the event is not on the toggle, close the menu
            if (isOpen &&
                !((_b = toggleRef === null || toggleRef === void 0 ? void 0 : toggleRef.current) === null || _b === void 0 ? void 0 : _b.contains(event.target)) &&
                !((_c = menuRef.current) === null || _c === void 0 ? void 0 : _c.contains(event.target))) {
                setIsOpen(false);
            }
        };
        window.addEventListener('keydown', handleMenuKeys);
        window.addEventListener('click', handleClick);
        return () => {
            window.removeEventListener('keydown', handleMenuKeys);
            window.removeEventListener('click', handleClick);
        };
    }, [focusTimeoutDelay, isOpen, menuRef, shouldPreventScrollOnItemFocus]);
    const renderItems = () => perPageOptions.map(({ value, title }) => (_jsxs(MenuItem, { "data-action": `per-page-${value}`, isSelected: perPage === value, onClick: (event) => handleNewPerPage(event, value), children: [title, ` ${perPageSuffix}`] }, value)));
    const toggle = (_jsx("div", { className: css(styles.paginationPageMenu), children: _jsxs(MenuToggle, Object.assign({ ref: toggleRef, onClick: onToggle }, (optionsToggleAriaLabel && { 'aria-label': optionsToggleAriaLabel }), { isDisabled: isDisabled || (itemCount && itemCount <= 0), isExpanded: isOpen }, (widgetId && { id: `${widgetId}-toggle` }), { variant: "plainText", "aria-haspopup": "listbox", children: [toggleTemplate &&
                    typeof toggleTemplate === 'string' &&
                    fillTemplate(toggleTemplate, { firstIndex, lastIndex, ofWord, itemCount, itemsTitle }), toggleTemplate &&
                    typeof toggleTemplate !== 'string' &&
                    toggleTemplate({
                        firstIndex,
                        lastIndex,
                        ofWord,
                        itemCount,
                        itemsTitle
                    }), !toggleTemplate && (_jsx(ToggleTemplate, { firstIndex: firstIndex, lastIndex: lastIndex, ofWord: ofWord, itemCount: itemCount, itemsTitle: itemsTitle }))] })) }));
    const menu = (_jsx(Menu, { className: css(className), onSelect: onSelect, ref: menuRef, children: _jsx(MenuContent, { children: _jsx(MenuList, { children: renderItems() }) }) }));
    const containerToAppendTo = appendTo !== null && appendTo !== void 0 ? appendTo : ((containerRef === null || containerRef === void 0 ? void 0 : containerRef.current) || undefined);
    return (_jsx(Popper, { trigger: toggle, triggerRef: toggleRef, popper: menu, popperRef: menuRef, isVisible: isOpen, direction: dropDirection, appendTo: containerToAppendTo, minWidth: minWidth !== undefined ? minWidth : 'revert' }));
};
PaginationOptionsMenu.displayName = 'PaginationOptionsMenu';
//# sourceMappingURL=PaginationOptionsMenu.js.map