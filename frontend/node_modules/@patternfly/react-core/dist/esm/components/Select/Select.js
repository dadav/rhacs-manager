import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef, useEffect, useRef } from 'react';
import { css } from '@patternfly/react-styles';
import { Menu, MenuContent } from '../Menu';
import { Popper } from '../../helpers/Popper/Popper';
import { getOUIAProps, getDefaultOUIAId, onToggleArrowKeydownDefault } from '../../helpers';
const SelectBase = (_a) => {
    var { children, className, onSelect, isOpen, selected, toggle, shouldFocusToggleOnSelect = false, shouldFocusFirstItemOnOpen = false, onOpenChange, onOpenChangeKeys = ['Escape', 'Tab'], onToggleKeydown, variant, isPlain, innerRef, zIndex = 9999, role = 'listbox', popperProps, menuHeight, maxMenuHeight, isScrollable, shouldPreventScrollOnItemFocus = true, focusTimeoutDelay = 0 } = _a, props = __rest(_a, ["children", "className", "onSelect", "isOpen", "selected", "toggle", "shouldFocusToggleOnSelect", "shouldFocusFirstItemOnOpen", "onOpenChange", "onOpenChangeKeys", "onToggleKeydown", "variant", "isPlain", "innerRef", "zIndex", "role", "popperProps", "menuHeight", "maxMenuHeight", "isScrollable", "shouldPreventScrollOnItemFocus", "focusTimeoutDelay"]);
    const localMenuRef = useRef(undefined);
    const localToggleRef = useRef(undefined);
    const menuRef = innerRef || localMenuRef;
    const toggleRef = typeof toggle === 'function' || (typeof toggle !== 'function' && !toggle.toggleRef)
        ? localToggleRef
        : toggle === null || toggle === void 0 ? void 0 : toggle.toggleRef;
    const prevIsOpen = useRef(isOpen);
    useEffect(() => {
        // menu was opened, focus on first menu item
        if (prevIsOpen.current === false && isOpen === true && shouldFocusFirstItemOnOpen) {
            setTimeout(() => {
                var _a;
                const firstElement = (_a = menuRef === null || menuRef === void 0 ? void 0 : menuRef.current) === null || _a === void 0 ? void 0 : _a.querySelector('li button:not(:disabled),li input:not(:disabled)');
                firstElement && firstElement.focus({ preventScroll: shouldPreventScrollOnItemFocus });
            }, focusTimeoutDelay);
        }
        prevIsOpen.current = isOpen;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);
    useEffect(() => {
        const handleMenuKeys = (event) => {
            var _a, _b, _c, _d;
            // Close the menu on tab or escape if onOpenChange is provided
            if (isOpen &&
                onOpenChange &&
                (((_a = menuRef.current) === null || _a === void 0 ? void 0 : _a.contains(event.target)) || ((_b = toggleRef.current) === null || _b === void 0 ? void 0 : _b.contains(event.target)))) {
                if (onOpenChangeKeys.includes(event.key)) {
                    event.preventDefault();
                    onOpenChange(false);
                    (_c = toggleRef.current) === null || _c === void 0 ? void 0 : _c.focus();
                }
            }
            if ((_d = toggleRef.current) === null || _d === void 0 ? void 0 : _d.contains(event.target)) {
                if (onToggleKeydown) {
                    onToggleKeydown(event);
                }
                else if (isOpen && variant !== 'typeahead') {
                    onToggleArrowKeydownDefault(event, menuRef);
                }
            }
        };
        const handleClick = (event) => {
            var _a, _b;
            // If the event is not on the toggle and onOpenChange callback is provided, close the menu
            if (isOpen && onOpenChange && !((_a = toggleRef === null || toggleRef === void 0 ? void 0 : toggleRef.current) === null || _a === void 0 ? void 0 : _a.contains(event.target))) {
                if (isOpen && !((_b = menuRef.current) === null || _b === void 0 ? void 0 : _b.contains(event.target))) {
                    onOpenChange(false);
                }
            }
        };
        window.addEventListener('keydown', handleMenuKeys);
        window.addEventListener('click', handleClick);
        return () => {
            window.removeEventListener('keydown', handleMenuKeys);
            window.removeEventListener('click', handleClick);
        };
    }, [
        isOpen,
        menuRef,
        toggleRef,
        onOpenChange,
        onOpenChangeKeys,
        onToggleKeydown,
        shouldPreventScrollOnItemFocus,
        shouldFocusFirstItemOnOpen,
        focusTimeoutDelay
    ]);
    const menu = (_jsx(Menu, Object.assign({ role: role, className: css(className), ref: menuRef, onSelect: (event, value) => {
            onSelect && onSelect(event, value);
            shouldFocusToggleOnSelect && toggleRef.current.focus();
        }, isPlain: isPlain, selected: selected, isScrollable: isScrollable !== null && isScrollable !== void 0 ? isScrollable : (menuHeight !== undefined || maxMenuHeight !== undefined) }, getOUIAProps(Select.displayName, props.ouiaId !== undefined ? props.ouiaId : getDefaultOUIAId(Select.displayName), props.ouiaSafe !== undefined ? props.ouiaSafe : true), props, { children: _jsx(MenuContent, { menuHeight: menuHeight, maxMenuHeight: maxMenuHeight, children: children }) })));
    return (_jsx(Popper, Object.assign({ trigger: typeof toggle === 'function' ? toggle(toggleRef) : toggle.toggleNode, triggerRef: toggleRef, popper: menu, popperRef: menuRef, isVisible: isOpen, zIndex: zIndex }, popperProps)));
};
export const Select = forwardRef((props, ref) => _jsx(SelectBase, Object.assign({ innerRef: ref }, props)));
Select.displayName = 'Select';
//# sourceMappingURL=Select.js.map