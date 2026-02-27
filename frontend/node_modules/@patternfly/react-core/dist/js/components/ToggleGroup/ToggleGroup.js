"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToggleGroup = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_styles_1 = require("@patternfly/react-styles");
const toggle_group_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/ToggleGroup/toggle-group"));
const ToggleGroupItem_1 = require("./ToggleGroupItem");
const ToggleGroup = (_a) => {
    var { className, children, isCompact = false, areAllGroupsDisabled = false, 'aria-label': ariaLabel } = _a, props = tslib_1.__rest(_a, ["className", "children", "isCompact", "areAllGroupsDisabled", 'aria-label']);
    const toggleGroupItemList = react_1.Children.map(children, (child) => !((0, react_1.isValidElement)(child) && child.type === ToggleGroupItem_1.ToggleGroupItem)
        ? child
        : (0, react_1.cloneElement)(child, areAllGroupsDisabled ? { isDisabled: true } : {}));
    return ((0, jsx_runtime_1.jsx)("div", Object.assign({ className: (0, react_styles_1.css)(toggle_group_1.default.toggleGroup, isCompact && toggle_group_1.default.modifiers.compact, className), role: "group", "aria-label": ariaLabel }, props, { children: toggleGroupItemList })));
};
exports.ToggleGroup = ToggleGroup;
exports.ToggleGroup.displayName = 'ToggleGroup';
//# sourceMappingURL=ToggleGroup.js.map