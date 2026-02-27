"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DualListSelectorList = exports.DualListSelectorListBase = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_styles_1 = require("@patternfly/react-styles");
const dual_list_selector_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/DualListSelector/dual-list-selector"));
const DualListSelectorListItem_1 = require("./DualListSelectorListItem");
const DualListSelectorContext_1 = require("./DualListSelectorContext");
const DualListSelectorListBase = (_a) => {
    var { children, innerRef } = _a, props = tslib_1.__rest(_a, ["children", "innerRef"]);
    const { isTree, ariaLabelledBy, focusedOption, displayOption, selectedOptions, id, options, isDisabled } = (0, react_1.useContext)(DualListSelectorContext_1.DualListSelectorListContext);
    const hasOptions = () => options.length !== 0 || (children !== undefined && children.length !== 0);
    return ((0, jsx_runtime_1.jsx)("ul", Object.assign({ className: (0, react_styles_1.css)(dual_list_selector_1.default.dualListSelectorList) }, (hasOptions() && {
        role: isTree ? 'tree' : 'listbox',
        'aria-multiselectable': true,
        'aria-labelledby': ariaLabelledBy,
        'aria-activedescendant': focusedOption
    }), { "aria-disabled": isDisabled ? 'true' : undefined, ref: innerRef }, props, { children: options.length === 0
            ? children
            : options.map((option, index) => {
                if (displayOption(option)) {
                    return ((0, jsx_runtime_1.jsx)(DualListSelectorListItem_1.DualListSelectorListItem, { isSelected: selectedOptions.indexOf(index) !== -1, id: `${id}-option-${index}`, orderIndex: index, isDisabled: isDisabled, children: option }, index));
                }
                return;
            }) })));
};
exports.DualListSelectorListBase = DualListSelectorListBase;
exports.DualListSelectorListBase.displayName = 'DualListSelectorListBase';
exports.DualListSelectorList = (0, react_1.forwardRef)((props, ref) => ((0, jsx_runtime_1.jsx)(exports.DualListSelectorListBase, Object.assign({ innerRef: ref }, props))));
exports.DualListSelectorList.displayName = 'DualListSelectorList';
//# sourceMappingURL=DualListSelectorList.js.map