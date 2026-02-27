"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DualListSelectorListItem = exports.DualListSelectorListItemBase = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const dual_list_selector_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/DualListSelector/dual-list-selector"));
const react_styles_1 = require("@patternfly/react-styles");
const helpers_1 = require("../../../helpers");
const grip_vertical_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/grip-vertical-icon'));
const Button_1 = require("../../../components/Button");
const DualListSelectorContext_1 = require("./DualListSelectorContext");
const DualListSelectorListItemBase = (_a) => {
    var { onOptionSelect, orderIndex, children, className, id = (0, helpers_1.getUniqueId)('dual-list-selector-list-item'), isSelected, innerRef, isDraggable = false, isDisabled, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    draggableButtonAriaLabel = 'Reorder option' } = _a, props = tslib_1.__rest(_a, ["onOptionSelect", "orderIndex", "children", "className", "id", "isSelected", "innerRef", "isDraggable", "isDisabled", "draggableButtonAriaLabel"]);
    const privateRef = (0, react_1.useRef)(null);
    const ref = innerRef || privateRef;
    const { setFocusedOption } = (0, react_1.useContext)(DualListSelectorContext_1.DualListSelectorListContext);
    return ((0, jsx_runtime_1.jsx)("li", Object.assign({ className: (0, react_styles_1.css)(dual_list_selector_1.default.dualListSelectorListItem, className, isDisabled && dual_list_selector_1.default.modifiers.disabled), onClick: isDisabled
            ? undefined
            : (e) => {
                setFocusedOption(id);
                onOptionSelect(e, id);
            }, onKeyDown: (e) => {
            if (e.key === ' ' || e.key === 'Enter') {
                document.activeElement.click();
                e.preventDefault();
            }
        }, "aria-selected": isSelected, id: id, ref: ref, role: "option", tabIndex: -1 }, props, { children: (0, jsx_runtime_1.jsxs)("div", { className: (0, react_styles_1.css)(dual_list_selector_1.default.dualListSelectorListItemRow, isSelected && dual_list_selector_1.default.modifiers.selected), children: [isDraggable && !isDisabled && ((0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(dual_list_selector_1.default.dualListSelectorDraggable), children: (0, jsx_runtime_1.jsx)(Button_1.Button, { variant: Button_1.ButtonVariant.plain, component: "span", icon: (0, jsx_runtime_1.jsx)(grip_vertical_icon_1.default, { style: { verticalAlign: '-0.3em' } }) }) })), (0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(dual_list_selector_1.default.dualListSelectorItem), children: (0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(dual_list_selector_1.default.dualListSelectorItemMain), children: (0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(dual_list_selector_1.default.dualListSelectorItemText), children: children }) }) })] }) }), orderIndex));
};
exports.DualListSelectorListItemBase = DualListSelectorListItemBase;
exports.DualListSelectorListItemBase.displayName = 'DualListSelectorListItemBase';
exports.DualListSelectorListItem = (0, react_1.forwardRef)((props, ref) => ((0, jsx_runtime_1.jsx)(exports.DualListSelectorListItemBase, Object.assign({ innerRef: ref }, props))));
exports.DualListSelectorListItem.displayName = 'DualListSelectorListItem';
//# sourceMappingURL=DualListSelectorListItem.js.map