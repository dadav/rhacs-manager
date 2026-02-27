"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TooltipContent = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const tooltip_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Tooltip/tooltip"));
const react_styles_1 = require("@patternfly/react-styles");
const TooltipContent = (_a) => {
    var { className, children, isLeftAligned } = _a, props = tslib_1.__rest(_a, ["className", "children", "isLeftAligned"]);
    return ((0, jsx_runtime_1.jsx)("div", Object.assign({ className: (0, react_styles_1.css)(tooltip_1.default.tooltipContent, isLeftAligned && tooltip_1.default.modifiers.textAlignLeft, className) }, props, { children: children })));
};
exports.TooltipContent = TooltipContent;
exports.TooltipContent.displayName = 'TooltipContent';
//# sourceMappingURL=TooltipContent.js.map