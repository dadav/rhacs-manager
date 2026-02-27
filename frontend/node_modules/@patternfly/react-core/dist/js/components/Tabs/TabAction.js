"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TabAction = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_styles_1 = require("@patternfly/react-styles");
const tabs_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Tabs/tabs"));
const Button_1 = require("../Button");
const helpers_1 = require("../../helpers");
const TabActionBase = (_a) => {
    var { children, className, onClick, isDisabled, 'aria-label': ariaLabel = 'Tab action', innerRef, ouiaId, ouiaSafe } = _a, props = tslib_1.__rest(_a, ["children", "className", "onClick", "isDisabled", 'aria-label', "innerRef", "ouiaId", "ouiaSafe"]);
    return ((0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(tabs_1.default.tabsItemAction, className), children: (0, jsx_runtime_1.jsx)(Button_1.Button, Object.assign({ ref: innerRef, type: "button", variant: "plain", "aria-label": ariaLabel, onClick: onClick, isDisabled: isDisabled, icon: (0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(tabs_1.default.tabsItemActionIcon), children: children }) }, (0, helpers_1.getOUIAProps)(exports.TabAction.displayName, ouiaId, ouiaSafe), props)) }));
};
exports.TabAction = (0, react_1.forwardRef)((props, ref) => ((0, jsx_runtime_1.jsx)(TabActionBase, Object.assign({}, props, { innerRef: ref }))));
exports.TabAction.displayName = 'TabAction';
//# sourceMappingURL=TabAction.js.map