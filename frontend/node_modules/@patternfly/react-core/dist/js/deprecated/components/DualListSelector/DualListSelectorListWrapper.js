"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DualListSelectorListWrapper = exports.DualListSelectorListWrapperBase = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const dual_list_selector_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/DualListSelector/dual-list-selector"));
const react_styles_1 = require("@patternfly/react-styles");
const helpers_1 = require("../../../helpers");
const DualListSelectorList_1 = require("./DualListSelectorList");
const DualListSelectorContext_1 = require("./DualListSelectorContext");
const DualListSelectorListWrapperBase = (_a) => {
    var { className, children, 'aria-labelledby': ariaLabelledBy, innerRef, options = [], selectedOptions = [], onOptionSelect, displayOption, id = (0, helpers_1.getUniqueId)('dual-list-selector-list'), isDisabled = false } = _a, props = tslib_1.__rest(_a, ["className", "children", 'aria-labelledby', "innerRef", "options", "selectedOptions", "onOptionSelect", "displayOption", "id", "isDisabled"]);
    const [focusedOption, setFocusedOption] = (0, react_1.useState)('');
    const ref = (0, react_1.useRef)(null);
    const menuRef = innerRef || ref;
    const { isTree } = (0, react_1.useContext)(DualListSelectorContext_1.DualListSelectorContext);
    // sets up keyboard focus handling for the dual list selector menu child of the pane. This keyboard
    // handling is applied whether the pane is dynamically built or passed via the children prop.
    const handleKeys = (event) => {
        if (!menuRef.current ||
            (menuRef.current !== event.target.closest(`.${dual_list_selector_1.default.dualListSelectorMenu}`) &&
                !Array.from(menuRef.current.getElementsByClassName(dual_list_selector_1.default.dualListSelectorMenu)).includes(event.target.closest(`.${dual_list_selector_1.default.dualListSelectorMenu}`)))) {
            return;
        }
        event.stopImmediatePropagation();
        const validOptions = isTree
            ? Array.from(menuRef.current.querySelectorAll(`.${dual_list_selector_1.default.dualListSelectorItemToggle}, .${dual_list_selector_1.default.dualListSelectorItemCheck} > input`))
            : Array.from(menuRef.current.getElementsByTagName('LI')).filter((el) => !el.classList.contains('pf-m-disabled'));
        const activeElement = document.activeElement;
        (0, helpers_1.handleArrows)(event, validOptions, (element) => activeElement.contains(element), (element) => {
            if (element.classList.contains(`.${dual_list_selector_1.default.dualListSelectorListItem}`)) {
                setFocusedOption(element.id);
            }
            else {
                setFocusedOption(element.closest(`.${dual_list_selector_1.default.dualListSelectorListItem}`).id);
            }
            return element;
        }, [`.${dual_list_selector_1.default.dualListSelectorItemToggle}`, `.${dual_list_selector_1.default.dualListSelectorItemCheck} > input`], undefined, false, false, false);
    };
    (0, react_1.useEffect)(() => {
        window.addEventListener('keydown', handleKeys);
        return () => {
            window.removeEventListener('keydown', handleKeys);
        };
    }, [menuRef.current]);
    return ((0, jsx_runtime_1.jsx)("div", Object.assign({ className: (0, react_styles_1.css)(dual_list_selector_1.default.dualListSelectorMenu, className), ref: menuRef, tabIndex: 0 }, props, { children: (0, jsx_runtime_1.jsx)(DualListSelectorContext_1.DualListSelectorListContext.Provider, { value: {
                setFocusedOption,
                isTree,
                focusedOption,
                ariaLabelledBy,
                displayOption,
                selectedOptions,
                id,
                options,
                onOptionSelect,
                isDisabled
            }, children: children ? children : (0, jsx_runtime_1.jsx)(DualListSelectorList_1.DualListSelectorList, {}) }) })));
};
exports.DualListSelectorListWrapperBase = DualListSelectorListWrapperBase;
exports.DualListSelectorListWrapperBase.displayName = 'DualListSelectorListWrapperBase';
exports.DualListSelectorListWrapper = (0, react_1.forwardRef)((props, ref) => ((0, jsx_runtime_1.jsx)(exports.DualListSelectorListWrapperBase, Object.assign({ innerRef: ref }, props))));
exports.DualListSelectorListWrapper.displayName = 'DualListSelectorListWrapper';
//# sourceMappingURL=DualListSelectorListWrapper.js.map