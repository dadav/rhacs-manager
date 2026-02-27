"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DualListSelectorTree = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_styles_1 = require("@patternfly/react-styles");
const dual_list_selector_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/DualListSelector/dual-list-selector"));
const DualListSelectorContext_1 = require("./DualListSelectorContext");
const DualListSelectorTreeItem_1 = require("./DualListSelectorTreeItem");
const DualListSelectorTree = (_a) => {
    var { data, hasBadges = false, isNested = false, defaultAllExpanded = false, onOptionCheck, isDisabled = false } = _a, props = tslib_1.__rest(_a, ["data", "hasBadges", "isNested", "defaultAllExpanded", "onOptionCheck", "isDisabled"]);
    const { hasAnimations } = (0, react_1.useContext)(DualListSelectorContext_1.DualListSelectorContext);
    const dataToRender = typeof data === 'function' ? data() : data;
    const tree = dataToRender.map((item) => ((0, jsx_runtime_1.jsx)(DualListSelectorTreeItem_1.DualListSelectorTreeItem, Object.assign({ text: item.text, hasAnimations: hasAnimations, id: item.id, defaultExpanded: item.defaultExpanded !== undefined ? item.defaultExpanded : defaultAllExpanded, onOptionCheck: onOptionCheck, isChecked: item.isChecked, checkProps: item.checkProps, hasBadge: item.hasBadge !== undefined ? item.hasBadge : hasBadges, badgeProps: item.badgeProps, itemData: item, isDisabled: isDisabled, useMemo: true }, (item.children && {
        children: ((0, jsx_runtime_1.jsx)(exports.DualListSelectorTree, { isNested: true, data: item.children, hasBadges: hasBadges, defaultAllExpanded: defaultAllExpanded, onOptionCheck: onOptionCheck, isDisabled: isDisabled }))
    })), item.id)));
    return isNested ? ((0, jsx_runtime_1.jsx)("ul", Object.assign({ className: (0, react_styles_1.css)(dual_list_selector_1.default.dualListSelectorList), role: "group" }, props, { children: tree }))) : ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: tree }));
};
exports.DualListSelectorTree = DualListSelectorTree;
exports.DualListSelectorTree.displayName = 'DualListSelectorTree';
//# sourceMappingURL=DualListSelectorTree.js.map