"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Select = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_styles_1 = require("@patternfly/react-styles");
const Menu_1 = require("../Menu");
const Popper_1 = require("../../helpers/Popper/Popper");
const helpers_1 = require("../../helpers");
const SelectBase = (_a) => {
    var { children, className, onSelect, isOpen, selected, toggle, shouldFocusToggleOnSelect = false, shouldFocusFirstItemOnOpen = false, onOpenChange, onOpenChangeKeys = ['Escape', 'Tab'], onToggleKeydown, variant, isPlain, innerRef, zIndex = 9999, role = 'listbox', popperProps, menuHeight, maxMenuHeight, isScrollable, shouldPreventScrollOnItemFocus = true, focusTimeoutDelay = 0 } = _a, props = tslib_1.__rest(_a, ["children", "className", "onSelect", "isOpen", "selected", "toggle", "shouldFocusToggleOnSelect", "shouldFocusFirstItemOnOpen", "onOpenChange", "onOpenChangeKeys", "onToggleKeydown", "variant", "isPlain", "innerRef", "zIndex", "role", "popperProps", "menuHeight", "maxMenuHeight", "isScrollable", "shouldPreventScrollOnItemFocus", "focusTimeoutDelay"]);
    const localMenuRef = (0, react_1.useRef)(undefined);
    const localToggleRef = (0, react_1.useRef)(undefined);
    const menuRef = innerRef || localMenuRef;
    const toggleRef = typeof toggle === 'function' || (typeof toggle !== 'function' && !toggle.toggleRef)
        ? localToggleRef
        : toggle === null || toggle === void 0 ? void 0 : toggle.toggleRef;
    const prevIsOpen = (0, react_1.useRef)(isOpen);
    (0, react_1.useEffect)(() => {
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
    (0, react_1.useEffect)(() => {
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
                    (0, helpers_1.onToggleArrowKeydownDefault)(event, menuRef);
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
    const menu = ((0, jsx_runtime_1.jsx)(Menu_1.Menu, Object.assign({ role: role, className: (0, react_styles_1.css)(className), ref: menuRef, onSelect: (event, value) => {
            onSelect && onSelect(event, value);
            shouldFocusToggleOnSelect && toggleRef.current.focus();
        }, isPlain: isPlain, selected: selected, isScrollable: isScrollable !== null && isScrollable !== void 0 ? isScrollable : (menuHeight !== undefined || maxMenuHeight !== undefined) }, (0, helpers_1.getOUIAProps)(exports.Select.displayName, props.ouiaId !== undefined ? props.ouiaId : (0, helpers_1.getDefaultOUIAId)(exports.Select.displayName), props.ouiaSafe !== undefined ? props.ouiaSafe : true), props, { children: (0, jsx_runtime_1.jsx)(Menu_1.MenuContent, { menuHeight: menuHeight, maxMenuHeight: maxMenuHeight, children: children }) })));
    return ((0, jsx_runtime_1.jsx)(Popper_1.Popper, Object.assign({ trigger: typeof toggle === 'function' ? toggle(toggleRef) : toggle.toggleNode, triggerRef: toggleRef, popper: menu, popperRef: menuRef, isVisible: isOpen, zIndex: zIndex }, popperProps)));
};
exports.Select = (0, react_1.forwardRef)((props, ref) => (0, jsx_runtime_1.jsx)(SelectBase, Object.assign({ innerRef: ref }, props)));
exports.Select.displayName = 'Select';
//# sourceMappingURL=Select.js.map